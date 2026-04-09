import base64
import json
import os
from googleapiclient import discovery

def stop_billing(event, context):
    # 1. Decode the message from Pub/Sub
    pubsub_data = base64.b64decode(event['data']).decode('utf-8')
    data = json.loads(pubsub_data)
    
    cost_amount = data.get('costAmount')
    budget_amount = data.get('budgetAmount')
    # project_id = os.environ.get('mylittleproject00')
    project_id = 'mylittleproject00'

    # 2. Check if we reached 100%
    if cost_amount >= budget_amount:
        print(f"Budget exceeded! Disabling billing for {project_id}")
        billing = discovery.build('cloudbilling', 'v1', cache_discovery=False)
        name = f'projects/{project_id}'
        
        # This removes the billing account link (The "Kill Switch")
        billing.projects().updateBillingInfo(name=name, body={'billingAccountName': ''}).execute()
    else:
        print(f"Budget at {cost_amount}. No action needed.")
