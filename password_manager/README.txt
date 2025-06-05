SecureVault

Hi there,

Thanks for checking out SecureVault. This project is a simple, secure application built to help you store private messages safely using encryption. It’s designed for people who want a lightweight tool to protect sensitive information without relying on big cloud services or complex systems.

What is SecureVault

SecureVault lets you write and store secret messages that only you or someone with the correct encryption key can read. It uses AES encryption under the hood, which means the data is unreadable without the proper key. The goal was to build something straightforward and secure that feels easy to use but still takes your privacy seriously.

Key Features

Encrypts your messages using AES encryption before saving them

Lets you define your own encryption key for each message

Simple web interface to add, view, and delete messages

No image or media dependencies, just text

Data stays local, and nothing is tracked or sent anywhere else

Tech Stack

This project was built using:

Python

Flask for the backend

SQLite for storing the encrypted messages

Cryptography library for encryption and decryption

HTML, CSS, and JavaScript for the frontend

How to Run It Locally

First, clone this repository to your machine

(Optional) Set up a virtual environment

Install the required Python libraries listed in requirements.txt

Run the Flask app

Open your browser and go to localhost on port 5000

Once it’s running, you’ll be able to add encrypted messages through a simple web form.

How Encryption Works

When you save a message, the app encrypts it using the AES algorithm and the key you provide. If you want to read the message later, you’ll need to input the same key. Without it, the message stays encrypted and unreadable. This app doesn’t store or log your key anywhere, so make sure you don’t lose it.

Why I Built This

I wanted something lightweight to store personal notes or sensitive data that I could trust and control. Cloud-based note apps are convenient, but they usually come with privacy trade-offs. SecureVault was built to give back that control.

Possible Future Improvements

There are a few things I might add in future versions:

User authentication and password protection

File-based import and export of encrypted messages

A way to share encrypted messages with time limits

Optional dark mode

Contribution

Feel free to open issues, suggest improvements, or fork the project. I’m always open to feedback, especially around encryption practices.

License

This project is open source and released under the MIT license.

Thanks again for checking it out. I hope you find it useful.