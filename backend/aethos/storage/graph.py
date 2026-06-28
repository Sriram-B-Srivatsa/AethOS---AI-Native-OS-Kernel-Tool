import json
import os

class KnowledgeGraph:
    def __init__(self, storage_path="storage/graph.json"):
        self.storage_path = storage_path
        self.edges = {}
        self._load_graph()

    def add_node(self, node_id):
        if node_id not in self.edges:
            self.edges[node_id] = {}

    def link(self, source, target, relation_type="related", weight=1.0):
        self.add_node(source)
        self.add_node(target)
        self.edges[source][target] = {"type": relation_type, "weight": weight}
        self.edges[target][source] = {"type": relation_type, "weight": weight}
        self._save_graph()

    def get_neighbors(self, node_id):
        return self.edges.get(node_id, {})

    def auto_link(self, new_file_id, vector_db, threshold=0.75):
        """
        ARCHITECTURAL FIX: Chunk-Aware Context Search.
        The Graph now correctly queries the VectorDB using the chunked naming schema.
        """
        content = ""

        # We must assume the input ID is clean (e.g., 'file.txt')
        # And construct the chunk ID to find the content in the DB
        chunk_id_to_find = f"{new_file_id}::chunk_0"

        for doc in vector_db.documents:
            # We check if the database entry STARTS with the filename,
            # to catch all chunks associated with it.
            if doc['filename'] == chunk_id_to_find:
                content = doc['content']
                break

        if not content:
            # The primary chunk was not found, so no context can be built.
            return

        results = vector_db.search(content, top_k=5)

        for res in results:
            # Prevent a file from linking to its own chunks
            if res['filename'].startswith(new_file_id):
                continue

            if res['score'] >= threshold:
                # We link the PARENT files, not the chunks, for a clean graph
                target_parent = res['filename'].split('::chunk_')[0]
                self.link(new_file_id, target_parent, "semantic", res['score'])

    def _save_graph(self):
        """ARCHITECTURAL FIX: Atomic Write."""
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        temp_path = self.storage_path + ".tmp"

        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(self.edges, f, indent=4)

        os.replace(temp_path, self.storage_path)

    def _load_graph(self):
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    self.edges = json.load(f)
            except json.JSONDecodeError:
                print(f"[KnowledgeGraph] CRITICAL: {self.storage_path} is corrupted. Starting fresh.")
                self.edges = {}
