from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Empresa, Organizacion, Usuario


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "activo", "creado_en")
    list_filter = ("activo",)
    search_fields = ("nombre",)
    ordering = ("-creado_en",)


@admin.register(Organizacion)
class OrganizacionAdmin(admin.ModelAdmin):
    list_display = ("id", "nombre", "cupos", "activo", "creado_en")
    list_filter = ("activo",)
    search_fields = ("nombre",)
    ordering = ("-creado_en",)


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    model = Usuario
    list_display = (
        "id",
        "username",
        "email",
        "first_name",
        "last_name",
        "organizacion",
        "empresa",
        "is_staff",
        "is_active",
        "is_superuser",
    )
    list_filter = ("is_staff", "is_active", "is_superuser", "organizacion", "empresa")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("-date_joined",)

    fieldsets = UserAdmin.fieldsets + (("Empresa", {"fields": ("organizacion", "empresa", "activo")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Empresa", {"fields": ("organizacion", "empresa", "activo")}),)
