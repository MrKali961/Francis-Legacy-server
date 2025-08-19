#!/bin/bash

# Test script for profile editing API endpoint
echo "Testing Profile Editing API"
echo "=========================="

# Test the PUT /api/family/profile endpoint
echo "Testing PUT /api/family/profile..."

# First, let's test without authentication (should fail)
echo "1. Testing without authentication (should return 401/403):"
curl -X PUT http://localhost:3001/api/family/profile \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User"
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "2. Testing route registration (GET request to see if route exists):"
curl -X GET http://localhost:3001/api/family/profile \
  -w "\nStatus: %{http_code}\n\n"

echo "Test completed!"