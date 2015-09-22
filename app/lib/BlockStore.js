/**
 * BlockStore
 */

var debug = require('debug')('io:BlockStore'); debug('module loading');
var console = require('./Logger')('io:BlockStore');
var invariant = require('./utils/invariant');

// Dependencies

var SiteConfig = require('./SiteConfig');
var DataStore = require('./DataStore');
var ensureKeys = require('./utils/ensureKeys');
var GlobalLock = require('./GlobalLock');
var BlockBuilder = require('./BlockBuilderSync');
var ChannelStore = require('./ChannelStore');

/**
 * Blocks and block constructors are stored in these run time objects
 */

var BlockConstructors = {};

var BlockInstances = {};

/**
 * All blocks are persisted in a single object by id-type pairs
 */

var db = DataStore.namespace('BlockStore');

var persistedBlockRefs = [];

function saveBlockRefs() {
  db.set('refs', persistedBlockRefs);
}

function loadBlockRefs() {
  persistedBlockRefs = db.get('refs') || [];
}

/**
 * Helpers
 */

function loadBlockConstructors() {
  if (Object.keys(BlockConstructors).length) {
    console.warn('BlockConstructors already loaded')
    return;
  }
  SiteConfig.BUILT_BLOCKTYPES.forEach(function(blocktype) {
    BlockConstructors[blocktype] = loadBlockConstructor(blocktype);
  });

  Object.keys(BlockConstructors).forEach(function(blocktype) {
    var BlockConstructor = BlockConstructors[blocktype];
    var LOCK_NAME = blocktype + ':assets';
    GlobalLock.add(LOCK_NAME);
    if (BlockConstructor.__buildFrontendAssets) {
      BlockConstructor.__buildFrontendAssets(function(error, bundleInfo) {
        if (error) throw new Error(error);
        GlobalLock.release(LOCK_NAME);
      });
    } else {
      // TODO refactor api, use
      // SiteConfig.AVAILABLE_CHANNELTYPES or
      // block's SUPPORTED_CHANNELTYPES here
      BlockBuilder(BLOCKTYPE, function(error, bundleInfo) {
        if (error) throw new Error(error);
        GlobalLock.release(LOCK_NAME);
      });
    }
  });
}

function loadBlockConstructor(blocktype) {
  debug('loading BlockConstructor: %s', blocktype);
  invariant(
    !BlockConstructors.hasOwnProperty(blocktype),
    'Already loaded: %s.',
    blocktype
  );

  var BlockConstructor = require('../blocktypes/' + blocktype);

  var missingStaticKeys = ensureKeys(
    BlockConstructor, [
      '__loadBlock',
      //'__createBlock',
      '__dangerouslyCreateBlock'
      //'__getFrontendAssetUrlsForChannel'
      //'__getPackageInfo'
    ]
  );
  invariant(
    !missingStaticKeys,
    'Blocktype `%s` does not implement %s.',
    blocktype,
    JSON.stringify(missingStaticKeys)
  );

  var missingProtoKeys = ensureKeys(
    BlockConstructor.prototype, [
      //'__save',
      '__injectChannel',
      //'__removeChannel',
      //'__getFrontendDataForChannel',
      '__getBlockFrontendConfigForChannelUser'
    ]
  );
  invariant(
    !missingProtoKeys,
    'Blocktype %s.prototype does not implement %s.',
    blocktype,
    JSON.stringify(missingProtoKeys)
  );

  return BlockConstructor;
}

function loadBlocks() {
  debug('loadBlocks called');
  if (persistedBlockRefs.length) {
    console.warn('blocks already loaded');
    return;
  }
  loadBlockRefs();
  // TODO handle core block separately from others, now included in
  // persistedBlockRefs
  persistedBlockRefs.forEach(function(blockRef) {
    debug('loading block: %j', blockRef);
    var BlockConstructor = BlockConstructors[blockRef.type];
    invariant(BlockConstructor, 'Blocktype %s unavailable.', blockRef.type);
    var block = BlockConstructor.__loadBlock(blockRef.id);
    invariant(
      block, 'Block id %s, type %s, not found.', blockRef.id, blockRef.type
    );
    invariant(!BlockInstances[block.id], 'Block already instatiated.');
    BlockInstances[block.id] = block;
  });

  if (!persistedBlockRefs.length) {
    debug('first run');
    firstRun();
  } else {
    debug('blocks existing, ignoring default config');
  }
}

function firstRun() {
  // Note: in case config changed in dev, new default instances will be added
  // only if db cleared.

  // First run: instantiate core first, then other demo blocks etc
  SiteConfig.DEFAULT_BLOCKINSTANCES.forEach(function(blockConfig) {
    debug('creating default block: %j', blockConfig);
    var BlockConstructor = BlockConstructors[blockConfig.type];
    invariant(
      BlockConstructor, 'Default blocktype %s unavailable.', blockConfig.type
    );
    invariant(
      BlockConstructor.__createBlock,
      'Block `%s` does not implement `__createBlock()`.',
      blockConfig.id
    );
    var block = BlockConstructor.__createBlock(blockConfig);
    invariant(
      block,
      'Default block %s, type %s could not be created. Clear db?',
      blockConfig.id,
      blockConfig.type
    );
    BlockStore.addBlock(block);
  });
}

function addBlock(block) {
  debug('adding block %s %s', block.id, block.type);
  invariant(block.id, 'Block id missing.');
  invariant(block.type, 'Block type missing.');
  invariant(
    !BlockInstances[block.id],
    'Block %s, type %s already in BlockStore.',
    block.id,
    block.type
  );
  BlockInstances[block.id] = block;
  persistedBlockRefs.push({id: block.id, type: block.type});
  saveBlockRefs();
}

function removeBlock(block) {
  debug('removing block %s %s', block.id, block.type);
  invariant(block.id, 'Block id missing.');
  invariant(
    BlockInstances[block.id],
    'Block %s, type %s not found in BlockStore.',
    block.id,
    block.type
  );

  if (typeof block.__dispose === 'function') block.__dispose();

  for (var channelId in block.channels) {
    var channel = block.channels[channelId];
    channel.detachBlock(block);
  }

  delete BlockInstances[block.id];
  for (var i = 0; i < persistedBlockRefs.length; i++) {
    if (persistedBlockRefs[i].id === block.id) {
      persistedBlockRefs.splice(i, 1);
      break;
    }
  }
  saveBlockRefs();
}


/**
 * Exports
 */

var BlockStore = {

  _constructors: BlockConstructors, // Expose for now

  _blocks: BlockInstances, // Expose for now

  getBlock: function(id) {
    if (BlockInstances.hasOwnProperty(id)) {
      return BlockInstances[id];
    }
  },

  loadBlockConstructors: loadBlockConstructors,

  loadBlocks: loadBlocks,

  addBlock: addBlock,

  removeBlock: removeBlock,

  dangerouslyCreateBlock: function(dangerousFormObject) {

    var type = dangerousFormObject.type;

    if (SiteConfig.BUILT_BLOCKTYPES.indexOf(type) == -1) {
      console.warn('attempted to create unbuilt block type: %s', type);
      return;
    }

    if (type === 'core') {
      console.warn('attempted to create core block, not allowed')
      return;
    }

    var BlockConstructor = BlockConstructors[type];

    if (!BlockConstructor) {
      console.error('BlockConstructor %s not found!', type);
      return;
    }

    var block = BlockConstructor.__dangerouslyCreateBlock(dangerousFormObject);
    if (!block) {
      console.error('%s.__dangerouslyCreateBlock did not return an instance', type);
      // TODO if validation fails, should perhaps req.reply('error')
      // but validation is done already on the client side for now.
      return;
    }

    debug('adding block to BlockStore');
    BlockStore.addBlock(block);
    debug('attaching block to channels');
    ChannelStore.attachBlockToChannels(block);

    return block;
  },

  liftBlock: function(block) {
    for (var channelId in block.channels) {
      var channel = block.channels[channelId];
      channel.liftBlock(block);
    }
  },

  lowerBlock: function(block) {
    for (var channelId in block.channels) {
      var channel = block.channels[channelId];
      channel.lowerBlock(block);
    }
  },

  selectBlock: function(block, selected) {
    if (typeof block.__setSelected !== 'function') {
      return;
    }
    block.__setSelected(!!selected);

    if (selected) {
      // Deselect previously selected block
      // NOTE: enumerates all blocks, not only channel blocks
      for (var otherBlockId in BlockInstances) {
        if (otherBlockId === block.id) {
          continue;
        }
        var otherBlock = BlockInstances[otherBlockId];
        if (typeof otherBlock.__setSelected !== 'function') {
          continue;
        }
        otherBlock.__setSelected(false);
      }
    }
  },

  showBlock: function(block, shown) {
    if (typeof block.__setVisible !== 'function') {
      return;
    }
    block.__setVisible(!!shown);
  }

};

module.exports = BlockStore;
