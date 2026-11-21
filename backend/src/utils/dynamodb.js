import { getDynamoDBClient } from '../lib/aws.js';
import { PutItemCommand, GetItemCommand, QueryCommand, ScanCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamodbClient = getDynamoDBClient();

function isNonEmpty(object) {
  return Object.keys(object).length > 0;
}

function expressionAttributes(values, names) {
  return {
    ExpressionAttributeValues: isNonEmpty(values) ? marshall(values) : undefined,
    ExpressionAttributeNames: isNonEmpty(names) ? names : undefined,
  };
}

function unmarshallAll(items) {
  return items ? items.map((item) => unmarshall(item)) : [];
}

export async function putItem(tableName, item) {
  return dynamodbClient.send(new PutItemCommand({ TableName: tableName, Item: marshall(item) }));
}

export async function getItem(tableName, key) {
  const result = await dynamodbClient.send(new GetItemCommand({ TableName: tableName, Key: marshall(key) }));
  return result.Item ? unmarshall(result.Item) : null;
}

export async function queryItems(tableName, keyConditionExpression, expressionAttributeValues = {}, expressionAttributeNames = {}) {
  const result = await dynamodbClient.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: keyConditionExpression,
    ...expressionAttributes(expressionAttributeValues, expressionAttributeNames),
  }));
  return unmarshallAll(result.Items);
}

export async function scanItems(tableName, filterExpression = null, expressionAttributeValues = {}, expressionAttributeNames = {}) {
  const result = await dynamodbClient.send(new ScanCommand({
    TableName: tableName,
    FilterExpression: filterExpression,
    ...expressionAttributes(expressionAttributeValues, expressionAttributeNames),
  }));
  return unmarshallAll(result.Items);
}

export async function updateItem(tableName, key, updateExpression, expressionAttributeValues = {}, expressionAttributeNames = {}) {
  const result = await dynamodbClient.send(new UpdateItemCommand({
    TableName: tableName,
    Key: marshall(key),
    UpdateExpression: updateExpression,
    ...expressionAttributes(expressionAttributeValues, expressionAttributeNames),
    ReturnValues: 'ALL_NEW',
  }));
  return result.Attributes ? unmarshall(result.Attributes) : null;
}

export async function deleteItem(tableName, key) {
  return dynamodbClient.send(new DeleteItemCommand({ TableName: tableName, Key: marshall(key) }));
}

export async function queryByUser(tableName, userId) {
  return queryItems(tableName, 'userId = :userId', { ':userId': userId });
}

export async function findUserByEmail(tableName, email) {
  const users = await scanItems(tableName, '#e = :email', { ':email': email }, { '#e': 'email' });
  return users[0] || null;
}
