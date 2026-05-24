const express = require("express");
require("dotenv").config();

const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const app = express();

const PORT = process.env.PORT || 8080;

const region = process.env.AWS_REGION || "eu-central-1";

const tableName = process.env.DYNAMODB_TABLE;

const client = new DynamoDBClient({
  region,
});

const dynamodb = DynamoDBDocumentClient.from(client);

app.get("/", async (req, res) => {
  const response = {
    app: "Elastic Beanstalk Node.js App",
    version: process.env.APP_VERSION || "2.0.0",
    status: "SUCCESS",
  };

  if (tableName) {
    console.log(`Scanning DynamoDB table: ${tableName}`);
    try {
      const data = await dynamodb.send(
        new ScanCommand({
          TableName: tableName,
          Limit: 5,
        })
      );

      response.dynamodb = data.Items || [];
    } catch (error) {
      console.error(`Error scanning DynamoDB table: ${tableName}`, error);
      response.dynamodb_error = error.message;
    }
  }

  res.json(response);
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

