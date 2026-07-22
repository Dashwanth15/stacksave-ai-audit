async function main() {
  const payload = {
    tools: [
      {
        toolId: 'cursor',
        plan: 'pro',
        monthlySpend: 20,
        seats: 1,
        useCase: 'coding'
      },
      {
        toolId: 'github-copilot',
        plan: 'business',
        monthlySpend: 19,
        seats: 1,
        useCase: 'coding'
      }
    ],
    teamSize: 1,
    useCase: 'coding',
    companyName: 'Debug Company',
    email: 'debug@stacksave.ai'
  };

  console.log('Sending audit request to http://localhost:5000/api/audits...');
  try {
    const res = await fetch('http://localhost:5000/api/audits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log('Response status:', res.status);
    const data = await res.json();
    console.log('Response JSON Data:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Network Error:', err.message);
  }
}

main();
