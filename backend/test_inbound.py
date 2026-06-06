import os
import sys
import uuid
import django

# Setup django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "configs.settings")
django.setup()

from apps.crm.tasks import procesar_evento_whatsapp
from apps.crm.models import WhatsAppConfig

def simulate_message():
    config = WhatsAppConfig.objects.filter(activo=True).first()
    if not config:
        print("Error: No active WhatsAppConfig found. Please create one in CRM.")
        return

    random_id = uuid.uuid4().hex
    wamid = f"wamid.HBgM{random_id[:32]}"
    
    payload = {
      "object": "whatsapp_business_account",
      "entry": [{
        "id": config.waba_id,
        "changes": [{
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "12345678",
              "phone_number_id": config.phone_number_id
            },
            "contacts": [{
              "profile": {
                "name": "Cliente de Prueba"
              },
              "wa_id": "5491122334455"
            }],
            "messages": [{
              "from": "5491122334455",
              "id": wamid,
              "timestamp": "1780768278",
              "text": {
                "body": f"Mensaje de prueba en vivo - ID {random_id[:6]}"
              },
              "type": "text"
            }]
          },
          "field": "messages"
        }]
      }]
    }
    
    print(f"Injecting message with wamid: {wamid}")
    procesar_evento_whatsapp(payload)
    print("Test message processed successfully!")

if __name__ == "__main__":
    simulate_message()
