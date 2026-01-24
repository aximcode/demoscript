import { resolve, dirname, basename } from 'path';
import { existsSync, readFileSync } from 'fs';
import chalk from 'chalk';
import { loadConfig, getApiUrl } from '../lib/config.js';

interface PushOptions {
  slug?: string;
  title?: string;
  public?: boolean;
  private?: boolean;
}

interface Demo {
  id: string;
  slug: string;
  title: string | null;
}

interface CreateDemoResponse {
  id: string;
  slug: string;
  title?: string;
  url: string;
  error?: string;
}

interface ListDemosResponse {
  demos: Demo[];
}

export async function push(demoPath: string, options: PushOptions): Promise<void> {
  const config = loadConfig();
  const apiUrl = getApiUrl();

  // Check authentication
  if (!config.token) {
    console.log(chalk.red('Not logged in.'));
    console.log(chalk.gray('Run: demoscript login'));
    process.exit(1);
  }

  // Resolve paths
  const resolvedPath = resolve(process.cwd(), demoPath);
  const demoDir = resolvedPath.endsWith('.yaml') ? dirname(resolvedPath) : resolvedPath;
  const demoFile = resolvedPath.endsWith('.yaml') ? resolvedPath : resolve(resolvedPath, 'demo.yaml');

  // Check if demo file exists
  if (!existsSync(demoFile)) {
    console.log(chalk.red(`Demo not found: ${demoFile}`));
    process.exit(1);
  }

  // Read demo YAML
  const yamlContent = readFileSync(demoFile, 'utf-8');

  // Try to parse YAML to get title
  let demoTitle: string | undefined = options.title;
  try {
    const yaml = await import('js-yaml');
    const parsed = yaml.load(yamlContent) as { title?: string };
    if (!demoTitle && parsed.title) {
      demoTitle = parsed.title;
    }
  } catch {
    // Ignore YAML parsing errors - the server will validate
  }

  // Read recordings if they exist
  const recordingsPath = resolve(demoDir, 'recordings.json');
  let recordingsJson: string | undefined;

  if (existsSync(recordingsPath)) {
    recordingsJson = readFileSync(recordingsPath, 'utf-8');
    console.log(chalk.gray('Found recordings.json'));
  } else {
    console.log(chalk.yellow('No recordings.json found. Demo will run in live mode.'));
    console.log();
  }

  // Determine slug
  const slug = options.slug || basename(demoDir).toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Determine visibility
  const isPublic = options.private ? false : (options.public !== undefined ? options.public : true);

  console.log(chalk.blue('Pushing demo to DemoScript Cloud...'));
  console.log();
  console.log(chalk.gray(`  Slug: ${slug}`));
  console.log(chalk.gray(`  Title: ${demoTitle || '(untitled)'}`));
  console.log(chalk.gray(`  Visibility: ${isPublic ? 'public' : 'private'}`));
  console.log(chalk.gray(`  Recordings: ${recordingsJson ? 'yes' : 'no'}`));
  console.log();

  try {
    // Check if demo already exists
    const listResponse = await fetch(`${apiUrl}/api/demos`, {
      headers: {
        'Authorization': `Bearer ${config.token}`,
      },
    });

    if (!listResponse.ok) {
      if (listResponse.status === 401) {
        console.log(chalk.red('Authentication expired. Please login again.'));
        console.log(chalk.gray('Run: demoscript login'));
        process.exit(1);
      }
      throw new Error(`Failed to fetch demos: ${listResponse.status}`);
    }

    const demosData = await listResponse.json() as ListDemosResponse;
    const existingDemo = demosData.demos.find(d => d.slug === slug);

    let response: Response;

    if (existingDemo) {
      // Update existing demo
      console.log(chalk.gray(`Updating existing demo (${existingDemo.id})...`));
      response = await fetch(`${apiUrl}/api/demos/${existingDemo.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          title: demoTitle,
          yaml_content: yamlContent,
          recordings_json: recordingsJson,
          is_public: isPublic,
        }),
      });
    } else {
      // Create new demo
      console.log(chalk.gray('Creating new demo...'));
      response = await fetch(`${apiUrl}/api/demos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          title: demoTitle,
          yaml_content: yamlContent,
          recordings_json: recordingsJson,
          is_public: isPublic,
        }),
      });
    }

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error || `Push failed with status ${response.status}`);
    }

    const data = await response.json() as CreateDemoResponse;

    console.log();
    console.log(chalk.green.bold('Push successful!'));
    console.log();

    if (data.url) {
      console.log('Your demo is live at:');
      console.log(chalk.cyan(`  ${data.url}`));
    } else {
      console.log('Your demo is live at:');
      console.log(chalk.cyan(`  ${apiUrl}/u/${config.username}/${slug}`));
    }

    console.log();

    if (!recordingsJson) {
      console.log(chalk.yellow('Note: Demo has no recordings. It will run in live mode.'));
      console.log(chalk.gray('Viewers need API access to execute steps.'));
    }
  } catch (err) {
    console.log(chalk.red('Push failed:'), err instanceof Error ? err.message : 'Unknown error');
    process.exit(1);
  }
}
