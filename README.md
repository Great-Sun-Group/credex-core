# Credex Ecosystem Core
Credex accounting and transaction management system with WhatsApp chatbot interface.


## To run with VS code on your local machine
### Prerequisites

Before running this project, make sure you have the following installed:

- Node.js (version 18.X.X or higher)
- npm (version X.X.X or higher)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Credex/credex-core.git
   ```

2. Navigate to the project directory:

   ```bash
   cd credex-core
   git checkout main.tmguni.whatsapp_client
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

### Running the Project

To run the project using nodemon, follow these steps:

1. Install nodemon globally (if not already installed):

   ```bash
   npm install -g nodemon
   ```

   This will install nodemon globally on your system.

2. Open a terminal and navigate to the project directory.

3. Run the following command:

   ```bash
   npm run nodemon
   ```

   This command will start the project using nodemon, which will automatically restart the server whenever changes are made to the code.

4. Open postman and visit `http://localhost:5000` to access the project endpoints.

## To run with a Codespaces virtual machine
### Prerequisites and installation
Executed automatically via devcontainer.

### Start the development server
   ```bash
   npm run nodemon
   ```
   This command will start the project using nodemon, which will automatically restart the server whenever changes are made to the code.

## Use Postman for endpoints
To use the web interface for postman:
1. Make the forwarded port public in the popup after 'npm run nodemon', or navigate to the Ports tab, right click the port, and set visibility to public.
2. In the Ports tab, copy the forwarded port address and paste it in the appropriate location in the credex-core variables in Postman
3. In the codespaces terminal print the Github Token with
   ```
   echo $GITHUB_TOKEN
   ```
   Copy the token and paste it the appropriate location in the credex-core variables in Postman
