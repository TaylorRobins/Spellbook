import type Database from 'better-sqlite3'

interface SpellSeed {
  name: string
  level: number
  traditions: string
  school: string
  cast_time: string
  components: string
  range: string
  area: string
  duration: string
  saving_throw: string
  description: string
  heightened_effects: string
}

export function seedSpells(db: Database.Database): void {
  const insert = db.prepare(`
    INSERT INTO spells (name, level, traditions, school, cast_time, components, range, area,
                        duration, saving_throw, description, heightened_effects)
    VALUES (@name, @level, @traditions, @school, @cast_time, @components, @range, @area,
            @duration, @saving_throw, @description, @heightened_effects)
  `)

  const insertMany = db.transaction((spells: SpellSeed[]) => {
    for (const spell of spells) insert.run(spell)
  })

  insertMany([
    {
      name: 'Detect Magic',
      level: 0,
      traditions: 'arcane,divine,occult,primal',
      school: 'divination',
      cast_time: '1 action',
      components: 'Somatic, Verbal',
      range: '30 feet',
      area: '30-foot emanation',
      duration: 'Sustained up to 1 minute',
      saving_throw: '',
      description:
        'You send out a pulse that registers the presence of magic. You receive no information beyond the presence or absence of magic. You can choose to ignore magic you\'re fully aware of, such as the magic items and ongoing spells of you and your allies.\n\nYou detect illusion, necromancy, and transmutation magics automatically. You also detect specific magic if you know its tradition and can identify it.',
      heightened_effects: JSON.stringify([
        {
          level: '3rd',
          effect:
            'You learn the school of magic for the strongest source of magic in the area. If multiple sources tie for strongest, you learn the school of a randomly determined source among those strongest sources.'
        }
      ])
    },
    {
      name: 'Prestidigitation',
      level: 0,
      traditions: 'arcane,divine,occult,primal',
      school: 'evocation',
      cast_time: '2 actions',
      components: 'Somatic, Verbal',
      range: '10 feet',
      area: '',
      duration: 'Up to 1 hour',
      saving_throw: '',
      description:
        'The simplest magic does your bidding. You exercise minor magical influence over an object or creature within range. Choose one of the following effects:\n\n• You temporarily clean or soil an object no larger than 1 Bulk.\n• You chill, warm, or flavor up to 1 pound of nonliving material for up to 1 hour.\n• You illuminate an object, causing it to shed bright light in a 20-foot radius until the start of your next turn.\n• You create a sound, such as a few notes of music, a bird\'s chirp, or a whisper, coming from a point within range.\n• You create a harmless sensory effect, such as a shower of sparks or a puff of wind.',
      heightened_effects: JSON.stringify([])
    },
    {
      name: 'Magic Missile',
      level: 1,
      traditions: 'arcane,occult',
      school: 'evocation',
      cast_time: '1 to 3 actions',
      components: 'Somatic, Verbal',
      range: '120 feet',
      area: '',
      duration: 'Instantaneous',
      saving_throw: '',
      description:
        'You send a dart of force streaking toward a creature that you can see. It automatically hits and deals 1d4+1 force damage. For each additional action you use when Casting the Spell, increase the number of missiles you shoot by one, to a maximum of three missiles for 3 actions. You choose the target for each missile individually. If you shoot more than one missile at the same target, combine the damage before applying bonuses or penalties.',
      heightened_effects: JSON.stringify([
        {
          level: '+2',
          effect: 'You shoot one additional missile with each action you spend.'
        }
      ])
    },
    {
      name: 'Heal',
      level: 1,
      traditions: 'divine,primal',
      school: 'necromancy',
      cast_time: '1 to 3 actions',
      components: 'Somatic, Verbal',
      range: 'Touch or 30 feet',
      area: '',
      duration: 'Instantaneous',
      saving_throw: 'Fortitude (undead only)',
      description:
        'You channel positive energy to heal the living or damage the undead. If the target is a willing living creature, you restore 1d8 Hit Points. If the target is undead, you deal that amount of positive damage to it, and it gets a basic Fortitude save.\n\n• 1 action: The range is touch. You restore 1d8 Hit Points to a willing living creature, or deal 1d8 positive damage to undead.\n• 2 actions: The range becomes 30 feet, and you restore or deal 1d8+8 HP.\n• 3 actions: You dispense healing in a 30-foot burst, restoring 1d8 Hit Points to each living creature.',
      heightened_effects: JSON.stringify([
        { level: '+1', effect: 'The amount of healing or damage increases by 1d8.' }
      ])
    },
    {
      name: 'Mage Armor',
      level: 1,
      traditions: 'arcane,occult',
      school: 'abjuration',
      cast_time: '2 actions',
      components: 'Somatic, Verbal',
      range: 'Personal',
      area: '',
      duration: 'Until next daily preparations',
      saving_throw: '',
      description:
        'You ward yourself with shimmering magical energy, gaining a +1 item bonus to AC and a maximum Dexterity modifier of +5. While wearing mage armor, you use your unarmored proficiency to calculate your AC.\n\nYou can Dismiss this spell.',
      heightened_effects: JSON.stringify([
        { level: '4th', effect: 'The bonus to AC increases to +1, and the armor gains resistance 3 to physical damage.' },
        { level: '6th', effect: 'The bonus to AC increases to +2.' },
        { level: '8th', effect: 'The bonus to AC increases to +3.' },
        { level: '10th', effect: 'The bonus to AC increases to +4.' }
      ])
    },
    {
      name: 'Hideous Laughter',
      level: 2,
      traditions: 'arcane,occult',
      school: 'enchantment',
      cast_time: '2 actions',
      components: 'Somatic, Verbal',
      range: '30 feet',
      area: '',
      duration: '1 minute',
      saving_throw: 'Will',
      description:
        'The target is overtaken with uncontrollable laughter.\n\n• Critical Success: The target is unaffected.\n• Success: The target is flat-footed for 1 round.\n• Failure: The target is fascinated with you for 1 minute. If the target is attacked or perceives a threat, it can spend 1 action on its turn attempting a new Will save to end the effect.\n• Critical Failure: As failure, except the target also falls prone and can\'t stand up for 1 minute.',
      heightened_effects: JSON.stringify([])
    },
    {
      name: 'Invisibility',
      level: 2,
      traditions: 'arcane,occult',
      school: 'illusion',
      cast_time: '2 actions',
      components: 'Material, Somatic',
      range: 'Touch',
      area: '',
      duration: '10 minutes',
      saving_throw: '',
      description:
        'Cloaked in illusion, the target becomes invisible. This makes it undetected to all creatures, though the creatures can attempt to find the target (making it only hidden to them) using the Seek action.\n\nIf the target uses a hostile action, the spell ends after that action is completed.',
      heightened_effects: JSON.stringify([
        { level: '4th', effect: 'The duration increases to 1 minute, and the spell doesn\'t end if the target uses hostile actions.' }
      ])
    },
    {
      name: 'Fireball',
      level: 3,
      traditions: 'arcane,primal',
      school: 'evocation',
      cast_time: '2 actions',
      components: 'Material, Somatic, Verbal',
      range: '500 feet',
      area: '20-foot burst',
      duration: 'Instantaneous',
      saving_throw: 'Reflex',
      description:
        'A roiling ball of fire explodes in the target area.\n\nEach creature in the burst takes 6d6 fire damage.\n\n• Critical Success: The creature takes no damage.\n• Success: The creature takes half damage.\n• Failure: The creature takes full damage.\n• Critical Failure: The creature takes double damage.',
      heightened_effects: JSON.stringify([
        { level: '+1', effect: 'The damage increases by 2d6.' }
      ])
    },
    {
      name: 'Haste',
      level: 3,
      traditions: 'arcane,occult,primal',
      school: 'transmutation',
      cast_time: '2 actions',
      components: 'Somatic, Verbal',
      range: '30 feet',
      area: '',
      duration: '1 minute',
      saving_throw: '',
      description:
        'Magic empowers the target to act faster. It gains the quickened condition and can use the extra action each round only for Strike and Stride actions.\n\nYou can Dismiss this spell.',
      heightened_effects: JSON.stringify([
        { level: '7th', effect: 'You can target up to 6 creatures.' }
      ])
    },
    {
      name: 'Animate Dead',
      level: 1,
      traditions: 'arcane,divine,occult',
      school: 'necromancy',
      cast_time: '2 actions',
      components: 'Somatic, Verbal',
      range: '30 feet',
      area: '',
      duration: 'Until next daily preparations',
      saving_throw: '',
      description:
        'You animate a corpse or skeleton, transforming it into an undead minion. The undead creature gains the minion trait and acts on your turn. You can have up to four undead minions at a time.\n\nThe undead creature must be an appropriate size and type for the level of the spell. Higher-level versions of this spell can animate more powerful undead.',
      heightened_effects: JSON.stringify([
        { level: '2nd', effect: 'You animate a creature with a level up to 1.' },
        { level: '3rd', effect: 'You animate a creature with a level up to 2.' },
        { level: '4th', effect: 'You animate a creature with a level up to 3, or two creatures with a level up to 1.' },
        { level: '5th', effect: 'You animate a creature with a level up to 5, or two creatures with a level up to 3.' },
        { level: '6th', effect: 'You animate a creature with a level up to 7, or two creatures with a level up to 5.' },
        { level: '7th', effect: 'You animate a creature with a level up to 9, or two creatures with a level up to 7.' },
        { level: '8th', effect: 'You animate a creature with a level up to 11, or two creatures with a level up to 9.' },
        { level: '9th', effect: 'You animate a creature with a level up to 13, or two creatures with a level up to 11.' },
        { level: '10th', effect: 'You animate a creature with a level up to 15, or two creatures with a level up to 13.' }
      ])
    },
    {
      name: 'Dimension Door',
      level: 4,
      traditions: 'arcane,occult',
      school: 'conjuration',
      cast_time: '2 actions',
      components: 'Verbal',
      range: '120 feet',
      area: '',
      duration: 'Instantaneous',
      saving_throw: '',
      description:
        'Opening a door of magical light, you instantly transport yourself and any items you\'re wearing and holding from your current space to a clear space within range you can see. If you\'re transporting only yourself, you don\'t need to be able to see the destination as long as you\'re familiar with the location, but you must succeed at a DC 8 flat check or the spell fails.',
      heightened_effects: JSON.stringify([
        { level: '5th', effect: 'The range increases to 1 mile. You don\'t need line of sight to your destination as long as you have been there previously.' }
      ])
    },
    {
      name: 'Wall of Fire',
      level: 4,
      traditions: 'arcane,primal',
      school: 'evocation',
      cast_time: '3 actions',
      components: 'Material, Somatic, Verbal',
      range: '120 feet',
      area: '60-foot line or 10-foot-radius ring',
      duration: 'Sustained up to 1 minute',
      saving_throw: 'Reflex',
      description:
        'You create a sheet of flames that burns everything that passes through it. The wall stands vertically, is 10 feet tall, and 1/2 inch thick. It doesn\'t block movement or sight.\n\nAnything that passes through the wall takes 4d6 fire damage (basic Reflex save). A creature taking persistent fire damage from the wall at the start of its turn must attempt another saving throw; on a failure, the fire continues burning it.',
      heightened_effects: JSON.stringify([
        { level: '+1', effect: 'The damage increases by 2d6.' }
      ])
    },
    {
      name: 'Feeblemind',
      level: 6,
      traditions: 'arcane,occult',
      school: 'enchantment',
      cast_time: '2 actions',
      components: 'Somatic, Verbal',
      range: '30 feet',
      area: '',
      duration: 'Varies',
      saving_throw: 'Will',
      description:
        'You reduce the target\'s mental capacity to that of an animal.\n\n• Critical Success: The target is unaffected.\n• Success: The target is stupefied 2 for 1 round.\n• Failure: The target is stupefied 4 for 1 minute. While stupefied this way, the target can\'t speak, and their speech becomes animalistic sounds. They can still move.\n• Critical Failure: As failure, but the duration is permanent.',
      heightened_effects: JSON.stringify([])
    },
    {
      name: 'Disintegrate',
      level: 6,
      traditions: 'arcane',
      school: 'transmutation',
      cast_time: '2 actions',
      components: 'Somatic, Verbal',
      range: '120 feet',
      area: '',
      duration: 'Instantaneous',
      saving_throw: 'Fortitude',
      description:
        'You fire a green ray at your target. Make a spell attack roll against the target\'s Fortitude DC. On a success, the target takes 12d10 force damage, and on a critical success it takes double damage. Additionally, if you roll a critical success and the target would be slain by this damage, the target is entirely reduced to fine dust.\n\nAny unattended nonmagical object the ray hits is automatically disintegrated if it\'s Huge or smaller.',
      heightened_effects: JSON.stringify([
        { level: '+1', effect: 'The damage increases by 2d10.' }
      ])
    },
    {
      name: 'Regenerate',
      level: 7,
      traditions: 'divine,primal',
      school: 'necromancy',
      cast_time: '2 actions',
      components: 'Somatic, Verbal',
      range: 'Touch',
      area: '',
      duration: '1 minute',
      saving_throw: '',
      description:
        'Powerful positive energy causes the target to heal at an incredible rate. The target regains 15 Hit Points at the start of each of your turns. Additionally, the spell can regrow severed body parts over time.\n\nIf the target has the dying condition, the dying value doesn\'t increase from the passage of time.',
      heightened_effects: JSON.stringify([
        { level: '+1', effect: 'The healing increases by 5 Hit Points.' }
      ])
    },
    {
      name: 'Wish',
      level: 10,
      traditions: 'arcane',
      school: 'divination',
      cast_time: '3 actions',
      components: 'Material, Somatic, Verbal',
      range: 'Varies',
      area: '',
      duration: 'Varies',
      saving_throw: '',
      description:
        'You utter the words of a powerful wish, bending reality to your will. The GM determines the exact effect, but generally you can duplicate any spell of 9th level or lower, undo the effects of a single event or mistake that occurred within the last day, or create a powerful effect within the GM\'s discretion.\n\nWish is the mightiest spell a mortal can cast. Attempting to duplicate spells or effects outside the guidelines often results in partial fulfillment or unintended consequences.',
      heightened_effects: JSON.stringify([])
    }
  ])
}
