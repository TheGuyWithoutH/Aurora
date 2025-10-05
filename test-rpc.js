// Simple test script for the RPC GenerateText endpoint
// Run with: bun test-rpc.js or node test-rpc.js

const RPC_URL = "http://localhost:3002/api/internal/rpc";
// Or use your ngrok URL:
// const RPC_URL = "https://disklike-crysta-nonalkaloidal.ngrok-free.dev/api/internal/rpc";

async function testGenerateText() {
  console.log("🚀 Testing RPC GenerateText...\n");

  // Sample base64 encoded 1x1 red pixel PNG for testing

  const rpcRequest = {
    _tag: "Request",
    id: "1",
    traceId: "1",
    spanId: "1",
    sampled: true,
    headers: [],
    tag: "GenerateText",
    payload: {
      prompt: "I want you to answer only in a rap song format.",
      deviceId: "ugo2lol",
      conversationId: "a1c9b379-43b5-4955-841b-91b7b77e92a0",
    },
  };

  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rpcRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log("✅ Success!");
    console.log("📝 Response:", JSON.stringify(result, null, 2));

    if (result.success) {
      console.log("\n💬 Generated Text:", result.value);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

// Run the test
testGenerateText();
