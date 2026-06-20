# JobHub Appwrite Backend

This folder contains the complete backend for JobHub built with Appwrite and JavaScript.

## Project Structure

- `functions/`: Appwrite Functions in JavaScript.
- `shared/`: Shared constants, permissions, and client initialization.
- `setup.js`: Script to initialize database collections and attributes.

## Deployment Instructions

### 1. Prerequisite
- Appwrite CLI installed.
- Logged into your Appwrite instance: `appwrite login`.

### 2. Environment Variables
Ensure the following variables are set in your Appwrite Functions settings or a `.env` file for local scripts:
- `APPWRITE_ENDPOINT`: Your Appwrite endpoint (e.g., `https://cloud.appwrite.io/v1`).
- `APPWRITE_PROJECT_ID`: Your Project ID.
- `APPWRITE_API_KEY`: An API key with necessary permissions.

### 3. Register Mobile Platforms
The React Native client in `services/appwrite.js` uses:
```js
.setPlatform('com.jobhub.app')
```

Appwrite will reject login and account requests until this platform is registered in the project console. If you see this error:
```text
Invalid Origin. Register your new client (com.jobhub.app) as a new iOS platform on your project console dashboard
```

Add the platform in Appwrite:
1. Open the Appwrite Console.
2. Select the **JobHub** project (`1212125`).
3. Go to **Overview** or **Platforms**.
4. Click **Add platform**.
5. Add an **iOS** platform with bundle ID `com.jobhub.app`.
6. If you run Android builds, also add an **Android** platform with package name `com.jobhub.app`.

The Expo config in `app.json` must match these values:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.jobhub.app"
    },
    "android": {
      "package": "com.jobhub.app"
    }
  }
}
```

Restart the Expo dev server after changing Appwrite platform settings.

### 4. Collection Permissions
If login succeeds but the app logs this error while loading the current user:
```text
The current user is not authorized to perform the requested action.
```

Check the `jobhub_db/users` collection permissions in Appwrite. The app needs authenticated users to be able to read and create documents:
```text
read("users")
create("users")
```

Keep document security enabled. The app sets document-level `update` and `delete` permissions for the owning user when it creates profile documents.

### 5. Verify Connection
Before running the full setup, verify you can reach the Appwrite server:
```bash
node appwrite/check-connection.js
```

### 6. Setup Database
Run the setup script once to create all collections and attributes.

#### How to get the Appwrite API Key:
1. Log in to your [Appwrite Console](https://cloud.appwrite.io).
2. Select your project (**JobHub**).
3. In the left sidebar, click on **Settings**.
4. Click on the **API Keys** tab.
5. Click the **Create API Key** button.
6. Name it something like "Setup Key".
7. Under **Scopes**, you MUST select the following:
   - **Databases**: `databases.read`, `databases.write`
   - **Collections**: `collections.read`, `collections.write`
   - **Attributes**: `attributes.read`, `attributes.write`
   - **Indexes**: `indexes.read`, `indexes.write`
8. Click **Create**.
9. Copy the **Secret** (this is your API Key).

#### Running the Setup Script:
```bash
# In the project root directory
npm install node-appwrite dotenv

# Set your API Key and run the script (PowerShell)
$env:APPWRITE_API_KEY="your_api_key_here"; node appwrite/setup.js

# Or using a .env file in the root
# APPWRITE_API_KEY=your_key
# node appwrite/setup.js
```

### 7. Deploy Functions
Use the Appwrite CLI to deploy each function. Example:
```bash
cd functions/onJobPostCreated
appwrite functions createDeployment --functionId=[FUNCTION_ID] --entrypoint='index.js' --activate=true
```
Repeat for all functions in the `functions/` directory.

## Messaging Setup
- Configure a Push Provider in Appwrite Messaging (e.g., FCM for Expo).
- Use the `expo-provider-id` in the functions code or update it to match your provider ID.
