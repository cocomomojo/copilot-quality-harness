import { getDynamoDBClient } from '../lib/aws.js';
import { PutItemCommand, GetItemCommand, QueryCommand, ScanCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodbClient = getDynamoDBClient();

export async function putItem(tableName, item) {
  const command = new PutItemCommand({
    TableName: tableName,
    Item: marshall(item),
  });
  return dynamodbClient.send(command);
}

export async function getItem(tableName, key) {
  const command = new GetItemCommand({
    TableName: tableName,
    Key: marshall(key),
  });
  const result = await dynamodbClient.send(command);
  return result.Item ? unmarshall(result.Item) : null;
}

export async function queryItems(tableName, keyConditionExpression, expressionAttributeValues = {}, expressionAttributeNames = {}) {
  const command = new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? marshall(expressionAttributeValues) : undefined,
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
  });
  const result = await dynamodbClient.send(command);
  return result.Items ? result.Items.map(item => unmarshall(item)) : [];
}

export async function scanItems(tableName, filterExpression = null, expressionAttributeValues = {}, expressionAttributeNames = {}) {
  const command = new ScanCommand({
    TableName: tableName,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? marshall(expressionAttributeValues) : undefined,
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
  });
  const result = await dynamodbClient.send(command);
  return result.Items ? result.Items.map(item => unmarshall(item)) : [];
}

export async function updateItem(tableName, key, updateExpression, expressionAttributeValues = {}, expressionAttributeNames = {}) {
  const command = new UpdateItemCommand({
    TableName: tableName,
    Key: marshall(key),
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: Object.keys(expressionAttributeValues).length > 0 ? marshall(expressionAttributeValues) : undefined,
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    ReturnValues: 'ALL_NEW',
  });
  const result = await dynamodbClient.send(command);
  return result.Attributes ? unmarshall(result.Attributes) : null;
}

export async function deleteItem(tableName, key) {
  const command = new DeleteItemCommand({
    TableName: tableName,
    Key: marshall(key),
  });
  return dynamodbClient.send(command);
}
