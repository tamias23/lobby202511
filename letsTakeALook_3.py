#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Mon Apr 20 22:33:14 2026

@author: mat
"""

import os
from google.cloud import firestore
# Point the SDK to the emulator on the HOST side
os.environ["FIRESTORE_EMULATOR_HOST"] = "localhost:18080"
os.environ["GOOGLE_CLOUD_PROJECT"]    = "my-local-firestore"
db = firestore.Client()
# Example: read all docs from a collection
for doc in db.collection("games").stream():
    print(doc.id, doc.to_dict())


