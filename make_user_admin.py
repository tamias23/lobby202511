#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Wed Apr 22 11:28:11 2026

@author: mat
"""

import os
from google.cloud import firestore

# Configuration
PROJECT_ID = "mylittleproject00"
USE_EMULATOR = True 

def make_user_admin(username_to_promote):
    # 1. Initialize Client
    if USE_EMULATOR:
        os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:8080"
        os.environ["GOOGLE_CLOUD_PROJECT"] = "my-local-firestore"
        db = firestore.Client()
    else:
        db = firestore.Client(project=PROJECT_ID)
        
    print(f"Searching for user '{username_to_promote}'...")
    
    # 2. Find the user by their username
    users_ref = db.collection('users')
    query = users_ref.where('username', '==', username_to_promote).limit(1).stream()
    
    found = False
    for doc in query:
        found = True
        user_id = doc.id
        
        # 3. Update the document with admin privileges
        users_ref.document(user_id).update({
            'role': 'admin',
            'is_admin': 1
        })
        
        print(f"Success! '{username_to_promote}' (ID: {user_id}) is now an Admin.")
        
    if not found:
        print(f"Error: Could not find any user with the username '{username_to_promote}'.")

# Example usage:
make_user_admin("tamias23")
