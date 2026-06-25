const fs = require('fs');
const path = require('path');

function getHistory(type) {
  const dir = path.join(__dirname, 'history', type);
  const history = {};
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const dateKey = file.replace('.json', '');
      history[dateKey] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    }
  }
  return history;
}

module.exports = {
  daily: getHistory('daily'),
  weekly: getHistory('weekly')
};
