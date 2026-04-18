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
os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
os.environ["GOOGLE_CLOUD_PROJECT"] = "my-local-firestore"

# 2. Initialize the client
# It will now look at 'localhost:8080' instead of the live GCP servers
db = firestore.Client()

# 3. Test it out
def test_connection():
    """
    doc_ref = db.collection("test_collection").document("test_doc")
    doc_ref.set({"message": "Hello from Python and Podman!"})
    
    # Read it back
    doc = doc_ref.get()
    print(f"Stored data: {doc.to_dict()}")
    """
    collections = db.collections()
    
    for coll in collections:
        coll_name = coll.id
        print(f"found {coll_name}")

def drop_collection(collection_name):
    coll_ref = db.collection(collection_name)
    
    # This deletes the collection and all documents inside it recursively
    db.recursive_delete(reference=coll_ref)
    print(f"Collection '{collection_name}' has been dropped.")
    
test_connection()
drop_collection('test_collection')

db.close()
