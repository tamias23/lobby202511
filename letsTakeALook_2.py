#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Fri Apr 17 11:50:31 2026

@author: mat
"""

import os
from google.cloud import firestore

"""
Create a file named .env in your project root:
FIRESTORE_EMULATOR_HOST=localhost:8080
GOOGLE_CLOUD_PROJECT=my-local-firestore

from dotenv import load_dotenv
load_dotenv() # This loads the variables from the .env file automatically

from google.cloud import firestore
db = firestore.Client()
"""

# 1. Set the environment variables inside the script
os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8200"
os.environ["GOOGLE_CLOUD_PROJECT"] = "my-local-firestore"

# 2. Initialize the client
# It will now look at 'localhost:8080' instead of the live GCP servers
db = firestore.Client()

# 3. Test it out
def test_connection():
    doc_ref = db.collection("test_collection").document("test_doc")
    doc_ref.set({"message": "Hello from Python and Podman!"})
    
    # Read it back
    doc = doc_ref.get()
    print(f"Stored data: {doc.to_dict()}")


test_connection()

