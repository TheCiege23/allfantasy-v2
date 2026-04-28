const leagueId = 'ff9a28f0-cc2e-4a78-89c7-c907bb315776'; // from your URL

(async () => {
  try {
    const response = await fetch(`http://localhost:3000/api/leagues/${leagueId}/draft/pool`);
    
    if (!response.ok) {
      console.error(`Status ${response.status}`);
      process.exit(1);
    }
    
    const data = await response.json();
    
    // Find the problematic players
    const search = ['Russell Wilson', 'Russell Bidgen', 'Cameron Ward', 'Emmett', 'Luther Burden', 'Hockenson', 'Ed.uk'];
    
    const found = data.players.filter(p => 
      search.some(s => 
        (p.name || p.playerName || p.full_name || '').toLowerCase().includes(s.toLowerCase()) ||
        (p.displayName || '').toLowerCase().includes(s.toLowerCase())
      )
    );
    
    console.log('Found', found.length, 'problematic players:\n');
    found.forEach(p => {
      console.log(`Name: "${p.name || p.playerName || p.full_name || p.displayName}"`);
      console.log(`  Pos: ${p.position} | Team: ${p.team} | ADP: ${p.adp}`);
      console.log(`  Image: ${p.imageUrl || p.image || 'NULL'}`);
      console.log(`  SleeperId: ${p.sleeperId || 'NULL'}`);
      console.log('');
    });
    
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
