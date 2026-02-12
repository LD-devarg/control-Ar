from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0012_color_bono"),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE operativo_landing DROP COLUMN IF EXISTS color_boton;",
            reverse_sql=(
                "ALTER TABLE operativo_landing "
                "ADD COLUMN color_boton varchar(20) NOT NULL DEFAULT '#00ff00';"
            ),
        ),
    ]
