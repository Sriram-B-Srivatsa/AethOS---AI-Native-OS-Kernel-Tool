"""
AethOS Prime - Local File Indexer
=================================

This module recursively scans the user-defined `index_directory` to parse text,
code, and markdown files. It slices them into manageable chunks and feeds them
to the Semantic Vector Database to be encoded as 384-dimensional embeddings.

It explicitly ignores binary files, executables, and user-defined `ignored_dirs`.
"""
import os
import stat
import logging
import re

class LocalIndexer:
    def __init__(self, db, kg=None, config=None):
        self.config = config
        self.db = db
        self.kg = kg
        # Restrictive extensions
        self.supported_extensions =['.txt', '.md', '.py', '.csv']
        self.max_file_size = 1024 * 1024 * 5  # Reduced to 5MB

    def _is_system_or_hidden(self, filepath, filename):
        if filename.startswith('.'): return True
        try:
            attrs = os.stat(filepath).st_file_attributes
            if bool(attrs & (stat.FILE_ATTRIBUTE_HIDDEN | stat.FILE_ATTRIBUTE_SYSTEM)): return True
            return False
        except: return True

    def _semantic_chunk(self, text, max_length=1000):
        # Strict binary/garbage rejection
        for line in text.split('\n'):
            if len(line) > 1000:
                return []

        paragraphs = re.split(r'\n\s*\n', text)
        chunks =[]
        current_chunk = ""

        for p in paragraphs:
            if len(current_chunk) + len(p) < max_length:
                current_chunk += p + "\n\n"
            else:
                if current_chunk.strip(): chunks.append(current_chunk.strip())
                current_chunk = p + "\n\n"

        if current_chunk.strip(): chunks.append(current_chunk.strip())
        return chunks

    def scan_user_directory(self):
        """
        ARCHITECTURAL FIX: Opt-In Boundary.
        Instead of the whole user profile, we strictly target the 'Documents' folder.
        This prevents scanning Downloads (ISOs/Zips) or AppData caches.
        """
        user_root = os.path.expanduser("~")

        # Target only the Documents folder for safety during development
        documents_path = os.path.join(user_root, "Desktop\\Aeth_Test")

        # Fallback to Desktop if Documents somehow doesn't exist
        if not os.path.exists(documents_path):
            documents_path = os.path.join(user_root, "Desktop")

        return self.scan_directory(documents_path)

    def scan_directory(self, root_path):
        logging.info(f"[INDEXER] Starting bounded scan on: {root_path}")
        indexed_count = 0

        ignored = self.config.get("ignored_dirs", []) if self.config else []
        ignored.extend(['node_modules', 'venv', '__pycache__'])
        
        for dirpath, dirnames, filenames in os.walk(root_path):
            dirnames[:] =[d for d in dirnames if not self._is_system_or_hidden(os.path.join(dirpath, d), d) and d.lower() not in ignored]

            for filename in filenames:
                ext = os.path.splitext(filename)[1].lower()
                if ext in self.supported_extensions:
                    filepath = os.path.join(dirpath, filename)

                    if self._is_system_or_hidden(filepath, filename): continue

                    try:
                        if os.path.getsize(filepath) > self.max_file_size: continue
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()

                        if not content.strip(): continue

                        chunks = self._semantic_chunk(content)
                        if not chunks: continue

                        for chunk_idx, chunk_text in enumerate(chunks):
                            chunk_id = f"{filepath}::chunk_{chunk_idx}"
                            self.db.add_file(chunk_id, chunk_text)

                        if self.kg and chunks:
                            self.kg.auto_link(f"{filepath}::chunk_0", self.db, threshold=0.4)

                        indexed_count += 1
                        if indexed_count % 10 == 0:
                            print(f"[INDEXER] Processed {indexed_count} valid files...")

                    except: pass

        logging.info(f"[INDEXER] Scan complete. Memorized: {indexed_count}")
        return indexed_count
