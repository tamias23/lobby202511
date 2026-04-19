#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Sat Apr 18 10:46:01 2026

@author: mat
"""

import os
import pandas as pd
from google.cloud import firestore

# Configuration
PROJECT_ID = "mylittleproject00"
# Set this to True if you want to use your local Podman emulator
USE_EMULATOR = True 


os.chdir('/home/mat/Bureau/lobby202511/parquet/temp')

if USE_EMULATOR:
    os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"

def export_firestore_to_parquet():
    # 1. Initialize Client
    db = ''
    if USE_EMULATOR:
        os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
        os.environ["GOOGLE_CLOUD_PROJECT"] = "my-local-firestore"
        db = firestore.Client()
    else:
        db = firestore.Client(project=PROJECT_ID)
    
    # 2. List all top-level collections (tables)
    collections = db.collections()
    
    print(f"Connected to project: {PROJECT_ID}")
    
    for coll in collections:
        coll_name = coll.id
        print(f"Exporting collection: {coll_name}...")
        
        # 3. Stream all documents from the collection
        docs = coll.stream()
        data = []
        
        for doc in docs:
            doc_dict = doc.to_dict()
            doc_dict['doc_id'] = doc.id  # Include the Firestore ID as a column
            data.append(doc_dict)
        
        if not data:
            print(f" - Collection {coll_name} is empty. Skipping.")
            continue

        # 4. Convert to Pandas DataFrame
        df = pd.DataFrame(data)

        # 5. Save to Parquet (.paq)
        # We use engine='pyarrow' to ensure complex types are handled
        filename = f"{coll_name}"
        df.to_parquet(filename + '.parquet', engine='pyarrow', index=False)
        with pd.ExcelWriter(filename + '.xlsx', engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='data', index=False, startrow=0 , startcol=0)
            
        print(f" - Success! Saved {len(data)} rows to {filename}")

# if __name__ == "__main__":
#     export_firestore_to_parquet()

export_firestore_to_parquet()








