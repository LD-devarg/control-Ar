from rest_framework import serializers
from django.contrib.auth.models import Group

from .models import BEAT_TASKS_AVAILABLE, Empresa, Usuario


class EmpresaSerializer(serializers.ModelSerializer):
    beat_tasks_available = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Empresa
        fields = [
            "id",
            "nombre",
            "activo",
            "workers_activos",
            "beat_activo",
            "beat_tasks_config",
            "beat_tasks_available",
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


class UsuarioSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all(), required=False)
    group_names = serializers.SerializerMethodField()

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
            "empresa",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user

    def get_group_names(self, obj):
        return list(obj.groups.values_list("name", flat=True))


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]
