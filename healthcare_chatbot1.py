import streamlit as st
from dotenv import load_dotenv
from PyPDF2 import PdfReader
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.text_splitter import CharacterTextSplitter
from langchain.vectorstores import FAISS
from langchain.chains.question_answering import load_qa_chain
from langchain.llms import OpenAI
from langchain.callbacks import get_openai_callback
from langchain_experimental.agents.agent_toolkits import create_csv_agent
from pydub import AudioSegment
from deep_translator import GoogleTranslator
from gtts import gTTS
import pandas as pd
import time
import glob
import os
import openai
from langchain.schema import HumanMessage, AIMessage
from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import ChatOpenAI
from langchain_core.output_parsers import BaseOutputParser
import chardet
from langdetect import detect
import openpyxl
from torchvision import models, transforms
from PIL import Image
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import torch
from langdetect import detect
from typing import Optional

# ------------------ OpenAI API Key Utilities ------------------


def _get_openai_api_key(explicit_key: Optional[str] = None) -> Optional[str]:
    """Resolve OpenAI API key from (in order): explicit argument, Streamlit session_state, environment.
    If found, set openai.api_key and persist to session_state.
    """
    key = explicit_key or st.session_state.get(
        "openai_api_key") or os.environ.get("OPENAI_API_KEY")
    if key:
        openai.api_key = key
        st.session_state["openai_api_key"] = key
    return key


def _require_api_key(key: Optional[str]) -> bool:
    if not key:
        st.warning(
            "⚠️ OpenAI API key missing. Enter it in the sidebar to use this feature.")
        return False
    return True


# Load environment variables from a .env file
load_dotenv()

# Streamlit app configuration
st.set_page_config(
    page_title="AI Tool Stack",
    page_icon="🩺",
)


def translate_text(text, input_language, output_language):
    """Translate text using GoogleTranslator."""
    try:
        translator = GoogleTranslator(
            source=input_language, target=output_language)
        return translator.translate(text)
    except Exception as e:
        st.error(f"Translation error: {str(e)}")
        return text


def generate_audio(text, language, tld="com"):
    """Generate an audio file from text."""
    try:
        tts = gTTS(text=text, lang=language, tld=tld)
        output_path = "temp/output.mp3"
        os.makedirs("temp", exist_ok=True)
        tts.save(output_path)
        return output_path
    except Exception as e:
        st.error(f"Audio generation error: {str(e)}")
        return None


def extract_text_from_pdf(pdf_file):
    """Extract text from a single PDF file."""
    try:
        pdf_reader = PdfReader(pdf_file)
        text = "".join(page.extract_text()
                       for page in pdf_reader.pages if page.extract_text())
        return text
    except Exception as e:
        st.error(f"Error processing PDF file: {pdf_file.name} - {str(e)}")
        return ""


def process_pdf(pdf_files, output_language="en", tld="com"):
    st.header("Ask your PDF 📄")
    st.write("Processing PDF files...")

    combined_text = ""

    # Extract text from PDFs
    for pdf_file in pdf_files:
        combined_text += extract_text_from_pdf(pdf_file)

    if not combined_text.strip():
        st.warning(
            "No text extracted from the uploaded PDF files. Please check your files and try again.")
        return

    # Split text into chunks
    text_splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(combined_text)

    # Create embeddings (requires API key)
    api_key = _get_openai_api_key()
    if not _require_api_key(api_key):
        return
    try:
        embeddings = OpenAIEmbeddings()
        knowledge_base = FAISS.from_texts(chunks, embeddings)
    except Exception as e:
        st.error(f"Error creating knowledge base: {str(e)}")
        return

    # Show user input for questions
    user_question = st.text_input("Ask a question about your PDF:")
    if user_question:
        try:
            docs = knowledge_base.similarity_search(user_question)
            llm = ChatOpenAI()
            chain = load_qa_chain(llm, chain_type="stuff")
            with get_openai_callback() as cb:
                response = chain.run(input_documents=docs,
                                     question=user_question)
        except Exception as e:
            st.error(f"Error processing question: {str(e)}")
            return

        translated_response = translate_text(response, "en", output_language)
        st.write(translated_response)

        if st.checkbox("Generate audio for the response"):
            audio_file_path = generate_audio(
                translated_response, output_language, tld)
            if audio_file_path:
                with open(audio_file_path, "rb") as audio_file:
                    audio_bytes = audio_file.read()
                st.audio(audio_bytes, format="audio/mp3", start_time=0)


def translate_csv(df, source_language, target_language):
    translator = GoogleTranslator(
        source=source_language, target=target_language)
    translated_df = df.applymap(lambda x: translator.translate(str(x)))
    return translated_df


def detect_language(text):
    try:
        return detect(text)
    except ImportError:
        st.warning(
            "Language detection library 'langdetect' is not installed. Falling back to 'auto' for source language.")
        return 'auto'


def process_csv(open_api_key, input_language, output_language, tld):
    st.header("Question your Healthcare CSV")

    user_csv = st.file_uploader(
        "Upload your CSV files:", type="csv", accept_multiple_files=True)

    if user_csv is None or len(user_csv) == 0:
        st.warning("Please upload one or more CSV files for processing.")
        return

    dfs = []
    combined_translations = []

    for file in user_csv:
        file_name = file.name
        try:
            df = read_csv_with_fallback(file)
            dfs.append(df)
        except Exception as e:
            st.error(f"Error processing file '{file_name}': {str(e)}")

    if not dfs:
        st.warning(
            "No files were successfully processed. Please check your file formats and try again.")
        return

    for idx, df in enumerate(dfs):
        source_language = detect_language(df.to_string())

        target_language = st.selectbox(f"Detected source language for File {idx + 1} is '{source_language}'. Select target language:",
                                       options=["en", "es", "fr", "de", "hi", "te", "ml", "bn", "zh-CN", "ko", "la", "ta", "pl"])
        translated_df = translate_csv(
            df.copy(), source_language, target_language)

        # Combine original and translated data side by side, maintaining original as first column
        combined_df = pd.concat(
            [df.add_prefix('Original_'), translated_df.add_prefix('Translated_')], axis=1)
        combined_translations.append(combined_df)

        st.subheader(
            f"Original File {idx + 1} (Detected Source Language: {source_language})")
        st.write(df)
        st.subheader(
            f"Translated File {idx + 1} (Target Language: {target_language})")
        st.write(translated_df)

        user_question = st.text_input(
            f"Ask a question about translated File {idx + 1}:")

        if user_question:
            api_key = _get_openai_api_key(open_api_key)
            if _require_api_key(api_key):
                llm = OpenAI()
                agent = create_csv_agent(llm, translated_df, verbose=True)
                st.write(
                    f"Your question about translated File {idx + 1} was: {user_question}")
                response = agent.run(user_question)
                st.subheader(f"Response for Translated File {idx + 1}")
                st.write(response)

    if combined_translations:
        output_file = 'translated_data.xlsx'
        with pd.ExcelWriter(output_file) as writer:
            for i, combined_df in enumerate(combined_translations):
                combined_df.to_excel(
                    writer, sheet_name=f'File_{i+1}', index=False)

        st.download_button(
            label="Download Combined Data as Excel",
            data=open(output_file, 'rb'),
            file_name="translated_data.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )


def read_csv_with_fallback(file):
    encodings = ['utf-8', 'latin-1', 'cp1252', 'ISO-8859-1']
    for encoding in encodings:
        try:
            file.seek(0)
            df = pd.read_csv(file, encoding=encoding)
            return df
        except UnicodeDecodeError:
            continue

    try:
        file.seek(0)
        result = chardet.detect(file.read())
        encoding = result['encoding']
        file.seek(0)
        df = pd.read_csv(file, encoding=encoding)
        return df
    except Exception as e:
        raise RuntimeError(
            f"Failed to decode file using any encoding: {str(e)}")


def transcribe_audio(audio_file, api_key, input_language, output_language, tld):
    st.write(f"Transcribing audio file: {audio_file.name}")
    key = _get_openai_api_key(api_key)
    if not _require_api_key(key):
        return

    transcription_text = ""

    with st.spinner('Transcribing...'):
        try:
            transcription = openai.Audio.transcribe(
                model="whisper-1",
                file=audio_file
            )
            transcription_text = transcription['text']
        except openai.error.OpenAIError as e:
            if e.http_status == 413:
                st.warning(
                    "File is too large - breaking mp3 into smaller files and trying again...")
                with open("audio_file.mp3", "wb") as f:
                    f.write(audio_file.getbuffer())

                sound = AudioSegment.from_mp3("audio_file.mp3")
                halfway_point = len(sound) / 2
                first_half = sound[:halfway_point]
                second_half = sound[halfway_point:]

                first_half.export("first_half.mp3", format="mp3")
                second_half.export("second_half.mp3", format="mp3")

                try:
                    with open("first_half.mp3", "rb") as f:
                        transcription_first_half = openai.Audio.transcribe(
                            model="whisper-1",
                            file=f
                        )
                    with open("second_half.mp3", "rb") as f:
                        transcription_second_half = openai.Audio.transcribe(
                            model="whisper-1",
                            file=f
                        )
                    transcription_text = transcription_first_half['text'] + \
                        transcription_second_half['text']
                except openai.error.OpenAIError as e:
                    st.error(f"⚠️ {e}")
                    return
            else:
                st.error(f"⚠️ {e}")
                return

    st.subheader("Transcribed Text:")
    st.text_area("Transcribed Text", value=transcription_text, height=200)

    translated_response = translate_text(
        transcription_text, "en", output_language)
    st.write(translated_response)

    if st.checkbox("Generate audio for the response"):
        audio_file_path = generate_audio(
            translated_response, output_language, tld)
        audio_file = open(audio_file_path, "rb")
        audio_bytes = audio_file.read()
        st.audio(audio_bytes, format="audio/mp3", start_time=0)


def text_to_speech(input_language, output_language, text, tld):
    translated_text = GoogleTranslator(
        source=input_language, target=output_language).translate(text)
    tts = gTTS(translated_text, lang=output_language, tld=tld)
    result = "output"
    output_path = f"temp/{result}.mp3"
    if not os.path.exists("temp"):
        os.makedirs("temp")
    tts.save(output_path)
    return result, translated_text


def generate_healthcare_report(pdf_files, api_key, input_language, output_language, tld):
    st.header("Generate Healthcare Report")
    st.write("Processing PDF files to generate a healthcare report...")

    combined_text = ""
    for pdf_file in pdf_files:
        try:
            pdf_reader = PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            combined_text += text
        except Exception as e:
            st.error(f"Error processing PDF file: {pdf_file.name} - {str(e)}")
            continue

    if not combined_text:
        st.warning(
            "No text extracted from the uploaded PDF files. Please check your files and try again.")
        return

    # Split into chunks
    text_splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(combined_text)

    # Create embeddings (requires API key)
    api_key_real = _get_openai_api_key(api_key)
    if not _require_api_key(api_key_real):
        return
    embeddings = OpenAIEmbeddings()
    knowledge_base = FAISS.from_texts(chunks, embeddings)

    # Generate report
    llm = ChatOpenAI()
    chain = load_qa_chain(llm, chain_type="stuff")
    with get_openai_callback() as cb:
        report = chain.run(
            input_documents=chunks, question="Generate a healthcare report based on the provided information.")

    translated_report = translate_text(report, "en", output_language)
    st.write(translated_report)

    if st.checkbox("Generate audio for the report"):
        audio_file_path = generate_audio(
            translated_report, output_language, tld)
        audio_file = open(audio_file_path, "rb")
        audio_bytes = audio_file.read()
        st.audio(audio_bytes, format="audio/mp3", start_time=0)


def preprocess_image(image_path):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[
                             0.229, 0.224, 0.225])
    ])
    image = Image.open(image_path).convert("RGB")
    return transform(image).unsqueeze(0)


@st.cache_resource
def load_model(organ):
    model = models.resnet18(pretrained=True)
    if organ in ["Heart", "Lungs", "Kidney", "Liver"]:
        model.fc = torch.nn.Linear(model.fc.in_features, 4)
    elif organ in ["Knees", "Ankles"]:
        model.fc = torch.nn.Linear(model.fc.in_features, 5)
    model.eval()
    return model


def predict_image(model, image_path):
    image_tensor = preprocess_image(image_path)
    with torch.no_grad():
        output = model(image_tensor)
        _, predicted = torch.max(output, 1)
    if model.fc.out_features == 4:
        labels = ["Normal", "Mild Blockage",
                  "Moderate Blockage", "Severe Blockage"]
    elif model.fc.out_features == 5:
        labels = ["Normal", "Arthritis", "Fracture", "Swelling", "Dislocation"]
    return labels[predicted.item()], predicted.item()


def generate_recommendations(organ, condition):
    prompt = f"""
    A patient has been diagnosed with a {organ} issue, with the condition being {condition}.
    Provide:
    - Explanation of {condition} in terms of the organ's health.
    - Risks, dietary suggestions, medications, exercises, and precautions.
    """
    key = _get_openai_api_key()
    if not _require_api_key(key):
        return "(API key missing: cannot generate recommendations)"
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "system", "content": "You are a medical assistant providing detailed patient recommendations."},
                      {"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500
        )
        return response['choices'][0]['message']['content'].strip()
    except Exception as e:
        return f"Error generating recommendations: {e}"


def main():
    st.sidebar.title("Healthcare Assistant Tools")
    tool_selected = st.sidebar.selectbox(
        "Choose a tool",
        ("PDF Analysis", "CSV Analysis", "Text to Speech", "Audio Transcription",
         "Healthcare Chat", "Healthcare Report", "Organ Scan Report Analyzer")
    )
    open_api_key = st.sidebar.text_input(
        "Enter your OpenAI API key", type="password", key="api_key"
    )

    in_lang = st.sidebar.selectbox(
        "Select your input language",
        ("English", "Hindi", "Telugu", "Malayalam", "Bengali", "Chinese",
         "Korean", "Spanish", "German", "French", "Latin", "Tamil", "Polish"),
        key="input_language"
    )

    language_mapping = {
        "English": "en",
        "Hindi": "hi",
        "Telugu": "te",
        "Tamil": "ta",
        "Malayalam": "ml",
        "Bengali": "bn",
        "Chinese": "zh-CN",
        "Korean": "ko",
        "Spanish": "es",
        "German": "de",
        "French": "fr",
        "Latin": "la",
        "Polish": "pl"
    }

    input_language = language_mapping.get(in_lang, "en")

    out_lang = st.sidebar.selectbox(
        "Select your output language",
        ("English", "Hindi", "Telugu", "Malayalam", "Bengali", "Chinese",
         "Korean", "Spanish", "German", "French", "Latin", "Tamil"),
        key="output_language"
    )

    output_language = language_mapping.get(out_lang, "en")

    english_accent = st.sidebar.selectbox(
        "Select your accent",
        ("Default", "India", "United Kingdom", "United States",
         "Australia", "Ireland", "South Africa"),
        key="english_accent"
    )

    tld_mapping = {
        "Default": "com",
        "India": "co.in",
        "United Kingdom": "co.uk",
        "United States": "com",
        "Australia": "com.au",
        "Ireland": "ie",
        "South Africa": "co.za"
    }

    tld = tld_mapping.get(english_accent, "com")

    if tool_selected == "PDF Analysis":
        st.title("PDF Analysis 📄")
        pdf_files = st.file_uploader(
            "Upload your PDF files", type="pdf", accept_multiple_files=True)
        if pdf_files:
            process_pdf(pdf_files, output_language, tld)

    elif tool_selected == "CSV Analysis":
        st.title("CSV Analysis 📊")
        process_csv(open_api_key, input_language, output_language, tld)

    elif tool_selected == "Text to Speech":
        st.title('Text to Speech')

        text = st.text_input("Enter your text")

        display_output_text = st.checkbox(
            "Display output text:", key="display_output_text")

        if st.button("Convert"):
            result, output_text = text_to_speech(
                input_language, output_language, text, tld)
            audio_file_path = f"temp/{result}.mp3"
            tts = gTTS(text=output_text, lang=output_language)
            tts.save(audio_file_path)

            audio_file = open(audio_file_path, "rb")
            audio_bytes = audio_file.read()
            st.markdown('Your audio:')
            st.audio(audio_bytes, format="audio/mp3", start_time=0)
            if display_output_text:
                st.markdown('Output text')
                st.write(f"{output_text}")

        def remove_files(n):
            mp3_files = glob.glob("temp/*mp3")
            if len(mp3_files) != 0:
                now = time.time()
                n_days = n * 86400
                for f in mp3_files:
                    if os.stat(f).st_mtime < now - n_days:
                        os.remove(f)
                        print("Deleted", f)

        remove_files(7)

    elif tool_selected == "Audio Transcription":
        st.title('🎧 Audio -> Text')
        st.caption('Upload an mp3 file and get the text from it!')

        audio_file = st.file_uploader("Choose an mp3 file", type="mp3")

        if audio_file is not None:
            transcribe_audio(audio_file, open_api_key,
                             input_language, output_language, tld)

    elif tool_selected == "Healthcare Chat":
        st.title("Healthcare Chat Assistant 🩺")
        query = st.text_input("Ask your question:")
        if query:
            key = _get_openai_api_key(open_api_key)
            if _require_api_key(key):
                try:
                    response = openai.ChatCompletion.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": query}],
                        temperature=0.7
                    )
                    st.write(response['choices'][0]['message']['content'])
                except Exception as e:
                    st.error(f"Chat error: {e}")
    elif tool_selected == "Healthcare Report":
        pdf_files = st.file_uploader(
            "Upload your PDF files", type="pdf", accept_multiple_files=True)
        if pdf_files:
            generate_healthcare_report(
                pdf_files, open_api_key, input_language, output_language, tld)

    elif tool_selected == "Organ Scan Report Analyzer":
        st.title("Organ Scan Report Analyzer 🩻")
        organ = st.selectbox(
            "Select Organ", ["Heart", "Lungs", "Kidney", "Liver", "Knees", "Ankles"])
        uploaded_image = st.file_uploader(
            "Upload Medical Image", type=["jpg", "png"])
        if uploaded_image:
            image_path = f"temp_{uploaded_image.name}"
            with open(image_path, "wb") as f:
                f.write(uploaded_image.getbuffer())
            st.image(Image.open(image_path),
                     caption="Uploaded Image", use_column_width=True)

            model = load_model(organ)
            prediction, _ = predict_image(model, image_path)
            st.write(f"Diagnosis: {prediction}")

            recommendations = generate_recommendations(organ, prediction)
            st.write("Recommendations")
            st.text(recommendations)


if __name__ == "__main__":
    main()
# fully working ai tool script
