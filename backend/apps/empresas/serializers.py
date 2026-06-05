from rest_framework import serializers
from django.contrib.auth.models import Group
import re

from .models import (
    BEAT_TASKS_AVAILABLE,
    Empresa,
    Organizacion,
    Usuario,
    UsuarioEmpresaAcceso,
    NotificacionEstructural,
    TelegramBot,
)
from .permissions import is_admin_organizacional


class OrganizacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organizacion
        fields = ["id", "nombre", "cupos", "activo", "creado_en"]
        read_only_fields = ["id", "creado_en"]


class EmpresaSerializer(serializers.ModelSerializer):
    beat_tasks_available = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Empresa
        fields = [
            "id",
            "organizacion",
            "nombre",
            "codigo_prefijo",
            "meta_test_mode",
            "operating_mode",
            "activo",
            "workers_activos",
            "beat_activo",
            "beat_tasks_config",
            "beat_tasks_available",
            "telegram_chat_ids",
            "kpi_sync_last_run_at",
            "kpi_sync_last_status",
            "kpi_sync_last_error",
            "estado_sync_last_run_at",
            "estado_sync_last_status",
            "estado_sync_last_error",
            "creado_en",
        ]
        read_only_fields = [
            "id",
            "kpi_sync_last_run_at",
            "kpi_sync_last_status",
            "kpi_sync_last_error",
            "estado_sync_last_run_at",
            "estado_sync_last_status",
            "estado_sync_last_error",
            "creado_en",
        ]

    def get_beat_tasks_available(self, obj):
        return [{"key": key, "label": label} for key, label in BEAT_TASKS_AVAILABLE.items()]

    def validate_beat_tasks_config(self, value):
        if value in (None, {}):
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError("beat_tasks_config debe ser un objeto.")

        cleaned = {}
        for key, enabled in value.items():
            if key not in BEAT_TASKS_AVAILABLE:
                continue
            cleaned[key] = bool(enabled)
        return cleaned

    def validate_codigo_prefijo(self, value):
        if value in (None, ""):
            return None
        normalized = str(value).strip().upper()
        if not re.fullmatch(r"[A-Z]{2}", normalized):
            raise serializers.ValidationError("codigo_prefijo debe tener exactamente 2 letras.")
        qs = Empresa.objects.filter(codigo_prefijo=normalized)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError("codigo_prefijo ya esta en uso por otra empresa.")
        return normalized

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user and not request.user.is_superuser and "meta_test_mode" in attrs:
            raise serializers.ValidationError(
                {"meta_test_mode": "Solo superuser puede modificar test mode de Meta."}
            )
        return attrs

    def validate_telegram_chat_ids(self, value):
        if value in (None, []):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("telegram_chat_ids debe ser una lista.")
        cleaned = []
        seen = set()
        for item in value:
            chat_id = str(item).strip()
            if not chat_id:
                continue
            if chat_id in seen:
                continue
            seen.add(chat_id)
            cleaned.append(chat_id)
        return cleaned


class UsuarioSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all(), required=False)
    group_names = serializers.SerializerMethodField()
    empresas_permitidas = serializers.SerializerMethodField(read_only=True)
    empresa_operating_mode = serializers.SerializerMethodField(read_only=True)
    empresas_permitidas_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )

    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "groups",
            "group_names",
            "is_staff",
            "is_active",
            "is_superuser",
            "activo",
            "organizacion",
            "empresa",
            "empresa_operating_mode",
            "empresas_permitidas",
            "empresas_permitidas_ids",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]

    def validate(self, attrs):
        request = self.context.get("request")
        if request and request.user and request.user.is_superuser:
            empresa = attrs.get("empresa", getattr(self.instance, "empresa", None))
            organizacion = attrs.get("organizacion", getattr(self.instance, "organizacion", None))
            if empresa and organizacion and empresa.organizacion_id != organizacion.id:
                raise serializers.ValidationError(
                    {"empresa": "La empresa no pertenece a la organizacion seleccionada."}
                )
        return attrs

    def validate_empresas_permitidas_ids(self, value):
        request = self.context.get("request")
        if request and request.user and not (request.user.is_superuser or is_admin_organizacional(request.user)):
            raise serializers.ValidationError("Solo superuser o admin organizacional pueden asignar empresas permitidas.")
        if not value:
            return []
        existing = set(Empresa.objects.filter(id__in=value).values_list("id", flat=True))
        missing = [item for item in value if item not in existing]
        if missing:
            raise serializers.ValidationError(f"Empresas invalidas: {missing}")
        if request and request.user and is_admin_organizacional(request.user):
            org_id = request.user.organizacion_id
            if not org_id:
                raise serializers.ValidationError("El admin organizacional no tiene organizacion asignada.")
            outside = (
                Empresa.objects.filter(id__in=value)
                .exclude(organizacion_id=org_id)
                .values_list("id", flat=True)
            )
            outside = list(outside)
            if outside:
                raise serializers.ValidationError(
                    f"Empresas fuera de tu organizacion: {outside}"
                )
        unique_ids = []
        seen = set()
        for item in value:
            if item in seen:
                continue
            unique_ids.append(item)
            seen.add(item)
        return unique_ids

    @staticmethod
    def _is_pauta_group(groups) -> bool:
        if not groups:
            return False
        return any(group.name == "Pauta" for group in groups)

    def _sync_empresas_permitidas(self, user, empresa_ids):
        if empresa_ids is None:
            return
        UsuarioEmpresaAcceso.objects.filter(usuario_id=user.id).exclude(empresa_id__in=empresa_ids).delete()
        for empresa_id in empresa_ids:
            UsuarioEmpresaAcceso.objects.update_or_create(
                usuario_id=user.id,
                empresa_id=empresa_id,
                defaults={"activo": True},
            )

    def _apply_scope_for_non_superuser(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user or request.user.is_superuser:
            return

        requester = request.user
        if is_admin_organizacional(requester):
            if not requester.organizacion_id:
                raise serializers.ValidationError("El admin organizacional no tiene organizacion asignada.")
            validated_data["organizacion_id"] = requester.organizacion_id
            empresa = validated_data.get("empresa")
            if empresa and empresa.organizacion_id != requester.organizacion_id:
                raise serializers.ValidationError("La empresa seleccionada no pertenece a tu organizacion.")
            return

        # Admin/otros siempre quedan atados a su empresa actual
        validated_data["organizacion"] = None
        validated_data["empresa"] = requester.empresa

    def create(self, validated_data):
        empresas_ids = validated_data.pop("empresas_permitidas_ids", None)
        password = validated_data.pop("password", None)
        groups = validated_data.get("groups") or []
        self._apply_scope_for_non_superuser(validated_data)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        if empresas_ids is not None:
            if self._is_pauta_group(groups):
                self._sync_empresas_permitidas(user, empresas_ids)
            else:
                self._sync_empresas_permitidas(user, [])
        return user

    def update(self, instance, validated_data):
        empresas_ids = validated_data.pop("empresas_permitidas_ids", None)
        password = validated_data.pop("password", None)
        next_groups = validated_data.get("groups", instance.groups.all())
        self._apply_scope_for_non_superuser(validated_data)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        if empresas_ids is not None:
            if self._is_pauta_group(next_groups):
                self._sync_empresas_permitidas(user, empresas_ids)
            else:
                self._sync_empresas_permitidas(user, [])
        return user

    def get_group_names(self, obj):
        return list(obj.groups.values_list("name", flat=True))

    def get_empresa_operating_mode(self, obj):
        if obj.empresa_id and obj.empresa:
            return obj.empresa.operating_mode
        return Empresa.OPERATING_MODE_FULL

    def get_empresas_permitidas(self, obj):
        empresa_ids = set()
        if obj.empresa_id:
            empresa_ids.add(obj.empresa_id)
        extra = (
            UsuarioEmpresaAcceso.objects.filter(usuario_id=obj.id, activo=True)
            .select_related("empresa")
            .order_by("empresa__nombre", "empresa_id")
        )
        empresas = []
        for acceso in extra:
            empresa_ids.add(acceso.empresa_id)
            empresas.append(
                {
                    "id": acceso.empresa_id,
                    "nombre": acceso.empresa.nombre,
                    "activo": bool(acceso.empresa.activo),
                    "operating_mode": acceso.empresa.operating_mode,
                    "meta_test_mode": bool(acceso.empresa.meta_test_mode),
                }
            )

        if obj.empresa_id and all(item["id"] != obj.empresa_id for item in empresas):
            empresas.insert(
                0,
                {
                    "id": obj.empresa_id,
                    "nombre": obj.empresa.nombre if obj.empresa else f"Empresa #{obj.empresa_id}",
                    "activo": bool(getattr(obj.empresa, "activo", True)),
                    "operating_mode": getattr(obj.empresa, "operating_mode", Empresa.OPERATING_MODE_FULL),
                    "meta_test_mode": bool(getattr(obj.empresa, "meta_test_mode", False)),
                },
            )
        return empresas


class UsuarioEmpresaAccesoSerializer(serializers.ModelSerializer):
    class Meta:
        model = UsuarioEmpresaAcceso
        fields = ["id", "usuario", "empresa", "activo", "creado_en"]
        read_only_fields = ["id", "creado_en"]


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]


class NotificacionEstructuralSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)
    empresa_nombre = serializers.CharField(source="empresa.nombre", read_only=True)

    class Meta:
        model = NotificacionEstructural
        fields = [
            "id",
            "tipo",
            "mensaje",
            "payload",
            "leida",
            "creado_en",
            "actor",
            "actor_username",
            "empresa",
            "empresa_nombre",
            "organizacion",
        ]
        read_only_fields = fields


class TelegramBotSerializer(serializers.ModelSerializer):
    token = serializers.CharField(write_only=True, required=False, allow_blank=False)
    has_token = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TelegramBot
        fields = [
            "id",
            "nombre",
            "tipo",
            "activo",
            "token",
            "has_token",
            "creado_en",
            "actualizado_en",
        ]
        read_only_fields = ["id", "has_token", "creado_en", "actualizado_en"]

    def get_has_token(self, obj):
        return bool(str(obj.token_encrypted or "").strip())
