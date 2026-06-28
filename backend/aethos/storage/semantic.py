import os
# --- ARCHITECTURAL GUARD ---
# This must be set BEFORE importing sentence_transformers to suppress
# infrastructure warnings regarding Windows symlink permissions.
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

class VectorDB:
    def __init__(self, storage_path="storage/index.json"):
        self.storage_path = storage_path
        self.documents =[] 
        self.vectors = None 

        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, 'models', 'all-MiniLM-L6-v2-local')

        print(f"[VectorDB] Loading Offline Model from: {model_path}")
        if os.path.exists(model_path):
            self.model = SentenceTransformer(model_path)
        else:
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        self._load_db()

    def add_file(self, filename, content):
        vector = self.model.encode([content])[0]
        doc_entry = {"filename": filename, "content": content}
        self.documents.append(doc_entry)
        
        if self.vectors is None:
            self.vectors = np.array([vector])
        else:
            self.vectors = np.vstack([self.vectors, vector])
            
        self._save_db()

    def search(self, query_text, top_k=3):
        if self.vectors is None or len(self.documents) == 0:
            return[]
            
        query_vector = self.model.encode([query_text]).reshape(1, -1)
        scores = cosine_similarity(query_vector, self.vectors)[0]
        top_indices = scores.argsort()[-top_k:][::-1]
        
        results =[]
        for idx in top_indices:
            results.append({
                "filename": self.documents[idx]['filename'],
                "score": float(scores[idx]),
                "preview": self.documents[idx]['content'][:50] + "..."
            })
            
        return results

    def _save_db(self):
        """
        ARCHITECTURAL FIX: Atomic Write.
        Prevents JSON corruption if the program is killed during a write.
        """
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        temp_path = self.storage_path + ".tmp"
        
        # 1. Write to temporary file safely
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(self.documents, f)
            
        # 2. Atomic swap (OS level guarantee)
        os.replace(temp_path, self.storage_path)

    def _load_db(self):
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    self.documents = json.load(f)
                
                if self.documents:
                    texts = [d['content'] for d in self.documents]
                    self.vectors = self.model.encode(texts)
            except json.JSONDecodeError:
                print(f"[VectorDB] CRITICAL: {self.storage_path} is corrupted. Starting fresh.")
                self.documents =[]
                self.vectors = None