from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("operativo", "0016_alter_bono_length"),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE control_ar.operativo_landing ALTER COLUMN bono TYPE varchar(50);",
            reverse_sql="ALTER TABLE control_ar.operativo_landing ALTER COLUMN bono TYPE varchar(4);",
        ),
    ]
