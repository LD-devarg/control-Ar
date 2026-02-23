from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0014_usuario_meta_test_mode"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE empresas_empresa
                ADD COLUMN IF NOT EXISTS meta_test_mode boolean NOT NULL DEFAULT false;
            """,
            reverse_sql="""
                ALTER TABLE empresas_empresa
                DROP COLUMN IF EXISTS meta_test_mode;
            """,
        ),
        migrations.RunSQL(
            sql="""
                ALTER TABLE empresas_usuario
                DROP COLUMN IF EXISTS meta_test_mode;
            """,
            reverse_sql="""
                ALTER TABLE empresas_usuario
                ADD COLUMN IF NOT EXISTS meta_test_mode boolean NOT NULL DEFAULT false;
            """,
        ),
    ]
