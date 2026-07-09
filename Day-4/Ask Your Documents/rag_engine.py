import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_core.messages import HumanMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

load_dotenv()

# --- Configurations ---
CHROMA_DB_DIR = "./chroma_db"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

class RAGEngine:
    def __init__(self):
        # Initialize Embeddings (Runs locally, free & private)
        self.embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        
        # Initialize Vector Database
        self.vector_store = Chroma(
            collection_name="documents",
            embedding_function=self.embeddings,
            persist_directory=CHROMA_DB_DIR
        )
        
        # Initialize NVIDIA LLM via LangChain (OpenAI Compatible API)
        if not NVIDIA_API_KEY:
            raise ValueError("NVIDIA_API_KEY not found in .env")
            
        self.llm = ChatOpenAI(
            model="meta/llama-3.2-11b-vision-instruct",
            api_key=NVIDIA_API_KEY,
            base_url="https://integrate.api.nvidia.com/v1",
            max_tokens=2048,
            temperature=0.3
        )
        
        # QA Prompt Template
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an intelligent, professional AI assistant for an enterprise. "
                       "Answer the user's questions based ONLY on the following context. "
                       "If the answer is not contained in the context, politely state that you don't know based on the provided documents.\n\n"
                       "Context:\n{context}"),
            ("user", "{input}")
        ])
        
        # Setup Retrieval Chain using LCEL
        self.retriever = self.vector_store.as_retriever(search_kwargs={"k": 5})
        
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)
            
        self.qa_chain = (
            {"context": self.retriever | format_docs, "input": RunnablePassthrough()}
            | self.prompt
            | self.llm
            | StrOutputParser()
        )

    def ingest_document(self, file_path, filename):
        """Loads a document, chunks it, and adds it to the vector store."""
        print(f"Loading document: {filename}")
        
        # Select appropriate loader
        if file_path.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
        elif file_path.endswith(".docx"):
            loader = Docx2txtLoader(file_path)
        else:
            loader = TextLoader(file_path, encoding='utf-8')
            
        docs = loader.load()
        
        # Add metadata so we know where chunks came from
        for doc in docs:
            doc.metadata["source_file"] = filename
        
        # Chunk the text
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_documents(docs)
        
        # Add to ChromaDB
        self.vector_store.add_documents(chunks)
        print(f"Ingested {len(chunks)} chunks from {filename}.")
        return len(chunks)

    def remove_document(self, filename):
        """Removes a specific document's chunks from ChromaDB based on its filename."""
        print(f"Removing document: {filename}")
        try:
            # Delete from chroma DB collection using metadata filter
            self.vector_store.delete(where={"source_file": filename})
            return True
        except Exception as e:
            print(f"Error removing document {filename}: {e}")
            return False

    def get_active_documents(self):
        """Returns a list of unique filenames currently in the vector store."""
        try:
            results = self.vector_store.get(include=['metadatas'])
            metadatas = results.get('metadatas', [])
            sources = set()
            for meta in metadatas:
                if meta and 'source_file' in meta:
                    sources.add(meta['source_file'])
            return list(sources)
        except Exception as e:
            print(f"Error getting active documents: {e}")
            return []

    def ask_question_stream(self, query, images_base64=None):
        """Queries the RAG pipeline and yields chunks of the response."""
        print(f"Querying (Stream): {query}")
        
        # Manually extract sources from the retriever since we used LCEL
        docs = self.retriever.invoke(query)
        context = "\n\n".join(doc.page_content for doc in docs)
        
        sources = []
        for doc in docs:
            source_file = doc.metadata.get("source_file", "Unknown")
            if source_file not in sources:
                sources.append(source_file)

        import json
        yield json.dumps({"type": "sources", "data": sources}) + "\n"

        try:
            if images_base64 and len(images_base64) > 0:
                print(f"Attaching {len(images_base64)} images to the LLM prompt (Stream).")
                content = [
                    {"type": "text", "text": f"Use the following context to answer the question.\nContext:\n{context}\n\nQuestion: {query}"}
                ]
                for img_b64 in images_base64:
                    if not img_b64.startswith("data:image"):
                        img_b64 = f"data:image/png;base64,{img_b64}"
                    content.append({"type": "image_url", "image_url": {"url": img_b64}})
                    
                msg = HumanMessage(content=content)
                # Model doesn't support stream, so we invoke and yield the entire response
                response = self.llm.invoke([msg])
                yield json.dumps({"type": "text", "data": response.content}) + "\n"
            else:
                for chunk in self.qa_chain.stream(query):
                    yield json.dumps({"type": "text", "data": chunk}) + "\n"
                    
        except Exception as e:
            print(f"Error querying stream: {e}")
            yield json.dumps({"type": "error", "data": str(e)}) + "\n"

    def ask_question(self, query, images_base64=None):
        """Queries the RAG pipeline and optionally attaches base64 images to the LLM directly."""
        print(f"Querying: {query}")
        
        # Manually extract sources from the retriever since we used LCEL
        docs = self.retriever.invoke(query)
        context = "\n\n".join(doc.page_content for doc in docs)
        
        sources = []
        for doc in docs:
            source_file = doc.metadata.get("source_file", "Unknown")
            if source_file not in sources:
                sources.append(source_file)
                
        # Handle Multimodal logic manually if images are present
        if images_base64 and len(images_base64) > 0:
            print(f"Attaching {len(images_base64)} images to the LLM prompt.")
            content = [
                {"type": "text", "text": f"Use the following context to answer the question.\nContext:\n{context}\n\nQuestion: {query}"}
            ]
            for img_b64 in images_base64:
                # Ensure the prefix isn't repeated if the frontend sends it
                if not img_b64.startswith("data:image"):
                    img_b64 = f"data:image/png;base64,{img_b64}"
                content.append({"type": "image_url", "image_url": {"url": img_b64}})
                
            msg = HumanMessage(content=content)
            response = self.llm.invoke([msg])
            answer = response.content
        else:
            # Execute the standard text chain
            answer = self.qa_chain.invoke(query)
                
        return {
            "answer": answer,
            "sources": sources
        }

    def clear_documents(self):
        """Clears the vector store."""
        # Simple workaround to clear local ChromaDB: delete collection and recreate
        self.vector_store.delete_collection()
        self.vector_store = Chroma(
            collection_name="documents",
            embedding_function=self.embeddings,
            persist_directory=CHROMA_DB_DIR
        )
