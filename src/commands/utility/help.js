const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of all available commands.'),
    async execute(interaction) {
        await this.generateHelpMenu(interaction, interaction.client);
    },
    async executeText(message, args) {
        await this.generateHelpMenu(message, message.client);
    },
    async generateHelpMenu(context, client) {
        const commands = client.commands;
        const categories = {};

        commands.forEach(command => {
            const category = command.category || 'misc';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(`\`${command.data.name}\`: ${command.data.description}`);
        });

        const embed = new EmbedBuilder()
            .setTitle('Help Menu')
            .setColor('#2b2d31')
            .setDescription('Here is a list of all available commands. You can use them via Slash Commands (e.g. `/help`) or Prefix Commands (e.g. `$help`).\n\nSome commands require specific permissions or for you to be whitelisted for no-prefix mode.');

        for (const [category, cmds] of Object.entries(categories)) {
            embed.addFields({
                name: `${category.charAt(0).toUpperCase() + category.slice(1)} Commands`,
                value: cmds.join('\n')
            });
        }

        const replyOptions = { embeds: [embed] };
        if (context.reply) {
            await context.reply(replyOptions);
        } else {
            await context.channel.send(replyOptions);
        }
    }
};
