from __future__ import annotations


STYLE_FIELDS = (
    "color_titulo",
    "color_subtitulo",
    "color_keyword",
    "color_bono",
    "color_info",
    "form_bg_color",
    "form_bg_opacity",
    "form_field_border_color",
    "font_family",
    "font_scale",
    "font_titulo",
    "font_subtitulo",
    "font_keyword",
    "font_bono",
    "font_info",
    "font_boton",
    "font_form",
    "size_titulo",
    "size_subtitulo",
    "size_keyword",
    "size_bono",
    "size_info",
    "size_boton",
    "size_form",
    "weight_titulo",
    "weight_subtitulo",
    "weight_keyword",
    "weight_bono",
    "weight_info",
    "weight_boton",
    "weight_form",
    "bg_type",
    "bg_color",
    "bg_gradient",
)

DISPLAY_FIELDS = (
    "titulo",
    "subtitulo",
    "texto_boton",
    "texto_info",
    "texto_whatsapp",
    "mostrar_formulario",
    "mostrar_campo_nombre",
    "mostrar_campo_telefono",
    "mostrar_disclaimer",
    "mostrar_ticker",
    "mostrar_medios_pago",
    "mostrar_comunidad",
    "texto_comunidad",
    "mostrar_pasos",
    "texto_pasos",
)

BUSINESS_FIELDS = (
    "nombre",
    "url",
    "bono",
    "activo",
    "credencial_meta_id",
    "enviar_capi_pixel_extra",
    "credencial_meta_extra_id",
)


def landing_config_groups(landing) -> dict:
    return {
        "business": {field: getattr(landing, field, None) for field in BUSINESS_FIELDS},
        "display": {field: getattr(landing, field, None) for field in DISPLAY_FIELDS},
        "style": {field: getattr(landing, field, None) for field in STYLE_FIELDS},
    }
