import os
os.environ["OPENAI_API_KEY"] = ""
from flask import Flask, request, jsonify
from langchain_community.document_loaders import PyPDFLoader
from flask import Flask, request, jsonify
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from flask_cors import CORS

# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app)
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create the upload directory if it doesn't exist
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- Global Variables for RAG Pipeline ---
retrieval_chain = None
embeddings_model = OpenAIEmbeddings(model="text-embedding-3-small")
llm = ChatOpenAI(model="gpt-4o")

# --- API Endpoint to Upload a PDF and Initialize the Pipeline ---
@app.route('/upload', methods=['POST'])
def upload_file():
    global retrieval_chain
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(file_path)
        
        try:
            loader = PyPDFLoader(file_path)
            documents = loader.load()
            documents = [doc for doc in documents if doc.page_content.strip()]
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
            docs = text_splitter.split_documents(documents)
            
            vector_store = FAISS.from_documents(docs, embeddings_model)
            retriever = vector_store.as_retriever()
            
            prompt_template = ChatPromptTemplate.from_template(
                """Answer the following question in English based only on the provided context:
                <context>
                {context}
                </context>
                Question: {input}
                """
            )
            document_chain = create_stuff_documents_chain(llm, prompt_template)
            retrieval_chain = create_retrieval_chain(retriever, document_chain)
            
            print(f"File '{file.filename}' uploaded. RAG pipeline is ready.")
            return jsonify({"message": "File uploaded and RAG pipeline is ready."}), 200
        
        except Exception as e:
            return jsonify({"error": f"Error processing file: {e}"}), 500

# --- API Endpoint to Ask a Question ---
@app.route('/ask', methods=['POST'])
@app.route('/query', methods=['POST'])
def ask_question():
    global retrieval_chain
    if retrieval_chain is None:
        return jsonify({"error": "Please upload a PDF file first."}), 400
    
    data = request.get_json()
    if not data or 'question' not in data:
        return jsonify({"error": "Missing 'question' in request body"}), 400
    
    question = data['question']
    
    try:
        response = retrieval_chain.invoke({"input": question})
        answer = response["answer"].strip()
        return jsonify({"answer": answer}), 200
    except Exception as e:
        return jsonify({"error": f"Error generating answer: {e}"}), 500

# --- Main entry point to run the app ---
if __name__ == '__main__':
    app.run(debug=True)