const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

async function loadCommands(client) {
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFolders = fs.existsSync(commandsPath) ? fs.readdirSync(commandsPath) : [];
    const slashCommands = [];

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                command.category = folder;
                client.commands.set(command.data.name, command);
                slashCommands.push(command.data.toJSON());
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }

    if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
        console.warn('DISCORD_TOKEN or CLIENT_ID is missing. Cannot register slash commands globally.');
        return;
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    try {
        console.log(`Started refreshing ${slashCommands.length} application (/) commands.`);
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: slashCommands },
        );
        console.log(`Successfully reloaded ${slashCommands.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
}

module.exports = { loadCommands };
