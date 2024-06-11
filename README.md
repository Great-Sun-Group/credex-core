# Credex Ecosystem Core
Credex accounting and transaction management system with WhatsApp chatbot interface.


## To run in your local dev environment
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

### Use Postman for endpoints
1. Click the icon for the Postman extension in the sidebar and sign in. You may need to use the authorization token provided by Postman. Open the Credex Team Workspace.

2. In the codespaces terminal, print the Github Token with
```
echo $GITHUB_TOKEN
```
Copy the token and paste it the "X-Github-Token" field in the credex-core variables in Postman. A new token is created every codespae session. If the codespace stops, this step has to be completed again.

3. After `npm run nodemon`, copy the forwarded port address from the Ports tab and paste it in the "base_url" field in the credex-core variables in Postman. This url will remain constant for this specific codespace, even across multiple sessions.

The github token and base_url are currently saved globally in Postman, so if multiple people are working at the same time, we'll need to update Postman to handle that.