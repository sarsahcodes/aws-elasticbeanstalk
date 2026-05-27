const express = require("express");
require("dotenv").config();

const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 8080;

const region = process.env.AWS_REGION || "eu-central-1";

const tableName = process.env.DYNAMODB_TABLE || "app-users";

const APP_VERSION = process.env.APP_VERSION || "5.0.0";

console.log("====================================");
console.log("Application Starting...");
console.log("Region:", region);
console.log("Table:", tableName);
console.log("Version:", APP_VERSION);
console.log("====================================");

const client = new DynamoDBClient({
  region,
});

const dynamodb = DynamoDBDocumentClient.from(client);

//////////////////////////////////////////////////////
// Root Route
//////////////////////////////////////////////////////

app.get("/", async (req, res) => {
  const response = {
    app: "Elastic Beanstalk Node.js App",
    version: APP_VERSION,
    status: "SUCCESS",
    region,
    table: tableName,
    timestamp: new Date().toISOString(),
  };

  try {
    console.log(`Scanning DynamoDB table: ${tableName}`);

    const data = await dynamodb.send(
      new ScanCommand({
        TableName: tableName,
        Limit: 10,
      })
    );

    response.total_users = data.Items?.length || 0;
    response.users = data.Items || [];
  } catch (error) {
    console.error("DynamoDB Scan Error:", error);

    response.status = "ERROR";
    response.dynamodb_error = error.message;
  }

  res.status(200).json(response);
});

//////////////////////////////////////////////////////
// Health Check Route
//////////////////////////////////////////////////////

app.get("/health", async (req, res) => {
  try {
    await dynamodb.send(
      new ScanCommand({
        TableName: tableName,
        Limit: 1,
      })
    );

    return res.status(200).json({
      status: "OK",
      database: "CONNECTED",
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health Check Failed:", error);

    return res.status(500).json({
      status: "FAILED",
      database: "DISCONNECTED",
      error: error.message,
    });
  }
});

//////////////////////////////////////////////////////
// Get All Users
//////////////////////////////////////////////////////

app.get("/users", async (req, res) => {
  try {
    const data = await dynamodb.send(
      new ScanCommand({
        TableName: tableName,
      })
    );

    res.status(200).json({
      success: true,
      count: data.Items?.length || 0,
      users: data.Items || [],
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

//////////////////////////////////////////////////////
// Get Single User
//////////////////////////////////////////////////////

app.get("/users/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const data = await dynamodb.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          email,
        },
      })
    );

    if (!data.Item) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: data.Item,
    });
  } catch (error) {
    console.error("Get User Error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

//////////////////////////////////////////////////////
// Create User
//////////////////////////////////////////////////////

app.post("/users", async (req, res) => {
  try {
    const { email, name, role } = req.body;

    if (!email || !name || !role) {
      return res.status(400).json({
        success: false,
        message: "email, name and role are required",
      });
    }

    const user = {
      email,
      name,
      role,
      createdAt: new Date().toISOString(),
    };

    await dynamodb.send(
      new PutCommand({
        TableName: tableName,
        Item: user,
      })
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user,
    });
  } catch (error) {
    console.error("Create User Error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

//////////////////////////////////////////////////////
// 404 Route
//////////////////////////////////////////////////////

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

//////////////////////////////////////////////////////
// Start Server
//////////////////////////////////////////////////////

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});