import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export async function handlePoll(interaction: ChatInputCommandInteraction) {
  const question = interaction.options.getString('pregunta', true);
  const option1 = interaction.options.getString('opcion1');
  const option2 = interaction.options.getString('opcion2');
  const option3 = interaction.options.getString('opcion3');
  const option4 = interaction.options.getString('opcion4');
  const option5 = interaction.options.getString('opcion5');

  const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
  const yesNoEmojis = ['👍', '👎'];

  let embed: EmbedBuilder;
  let emojis: string[];

  const options = [option1, option2, option3, option4, option5].filter(
    (o) => o !== null && o !== undefined
  ) as string[];

  if (options.length === 0) {
    embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📊 Encuesta')
      .setDescription(`**${question}**\n\n👍 = Sí\n👎 = No`)
      .setFooter({
        text: `Encuesta creada por ${interaction.user.tag}`,
      })
      .setTimestamp();
    emojis = yesNoEmojis;
  } else {
    const optionsText = options
      .map((opt, i) => `${numberEmojis[i]} ${opt}`)
      .join('\n');

    embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📊 Encuesta')
      .setDescription(`**${question}**\n\n${optionsText}`)
      .setFooter({
        text: `Encuesta creada por ${interaction.user.tag} — Reacciona para votar`,
      })
      .setTimestamp();
    emojis = numberEmojis.slice(0, options.length);
  }

  await interaction.reply({ embeds: [embed] });

  const message = await interaction.fetchReply();
  for (const emoji of emojis) {
    await message.react(emoji).catch(() => {});
  }
}