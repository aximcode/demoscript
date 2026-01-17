import chalk from 'chalk';
import readline from 'readline';
import { loadConfig, saveConfig, getApiUrl, clearConfig } from '../lib/config.js';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

function prompt(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hidden) {
      // For password input, we need to handle it differently
      process.stdout.write(question);
      let password = '';
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf-8');

      const handler = (char: string) => {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.removeListener('data', handler);
          console.log();
          rl.close();
          resolve(password);
        } else if (char === '\u0003') {
          // Ctrl+C
          process.exit();
        } else if (char === '\u007f' || char === '\b') {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
        } else {
          password += char;
        }
      };

      process.stdin.on('data', handler);
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

export async function login(): Promise<void> {
  const apiUrl = getApiUrl();

  console.log(chalk.blue('Login to DemoScript Cloud'));
  console.log(chalk.gray(`API: ${apiUrl}`));
  console.log();

  const email = await prompt('Email: ');
  const password = await prompt('Password: ', true);

  console.log();
  console.log(chalk.gray('Authenticating...'));

  try {
    const response = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error || `Login failed with status ${response.status}`);
    }

    const data = await response.json() as LoginResponse;

    // Save token and user info to config
    const config = loadConfig();
    config.token = data.token;
    config.username = data.user.username;
    config.email = data.user.email;
    saveConfig(config);

    console.log();
    console.log(chalk.green.bold('Login successful!'));
    console.log(chalk.gray(`Logged in as ${data.user.username} (${data.user.email})`));
    console.log();
    console.log('You can now use:');
    console.log(chalk.cyan('  demoscript push <demo>') + ' - Push a demo to the cloud');
    console.log(chalk.cyan('  demoscript whoami') + '      - Show current user');
    console.log(chalk.cyan('  demoscript logout') + '     - Log out');
  } catch (err) {
    console.log();
    console.log(chalk.red('Login failed:'), err instanceof Error ? err.message : 'Unknown error');
    process.exit(1);
  }
}

export async function logout(): Promise<void> {
  clearConfig();
  console.log(chalk.green('Logged out successfully.'));
}

export async function whoami(): Promise<void> {
  const config = loadConfig();

  if (!config.token || !config.username) {
    console.log(chalk.yellow('Not logged in.'));
    console.log(chalk.gray('Run: demoscript login'));
    process.exit(1);
  }

  console.log(chalk.green(`Logged in as ${config.username}`));
  if (config.email) {
    console.log(chalk.gray(`Email: ${config.email}`));
  }
  console.log(chalk.gray(`API: ${getApiUrl()}`));
}
