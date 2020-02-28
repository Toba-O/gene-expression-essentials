// Copyright 2015-2020, University of Colorado Boulder

/**
 * Specific instance of protein
 *
 * @author John Blanco
 * @author Mohamed Safi
 * @author Aadish Gupta
 */

import Utils from '../../../../dot/js/Utils.js';
import Vector2 from '../../../../dot/js/Vector2.js';
import Shape from '../../../../kite/js/Shape.js';
import inherit from '../../../../phet-core/js/inherit.js';
import Color from '../../../../scenery/js/util/Color.js';
import Protein from '../../common/model/Protein.js';
import StubGeneExpressionModel from '../../common/model/StubGeneExpressionModel.js';
import geneExpressionEssentials from '../../geneExpressionEssentials.js';

// constants
const BASE_COLOR = new Color( 255, 99, 71 );
const FULL_GROWN_WIDTH = 450;

/**
 * @param {GeneExpressionModel} model
 * @constructor
 */
function ProteinB( model ) {
  model = model || new StubGeneExpressionModel();
  Protein.call( this, model, this.createInitialShape(), BASE_COLOR );
}

geneExpressionEssentials.register( 'ProteinB', ProteinB );

export default inherit( Protein, ProteinB, {

  /**
   * @override
   * @returns {ProteinB}
   * @public
   */
  createInstance: function() {
    return new ProteinB( this.model );
  },

  /**
   * @override
   * @param {number} growthFactor
   * @returns {Shape}
   * @protected
   */
  getScaledShape: function( growthFactor ) {
    return this.createShape( growthFactor );
  },

  /**
   * @override
   * @param {Vector2} attachmentPointPosition
   * @public
   */
  setAttachmentPointPosition: function( attachmentPointPosition ) {
    // Note: This is specific to this protein's shape, and will need to be adjusted if the protein's shape algorithm
    // changes.
    this.setAttachmentPointPositionXY( attachmentPointPosition.x, attachmentPointPosition.y );
  },

  /**
   * @param {number} attachmentPointPositionX
   * @param {number} attachmentPointPositionY
   * @private
   */
  setAttachmentPointPositionXY: function( attachmentPointPositionX, attachmentPointPositionY ) {
    // Note: This is specific to this protein's shape, and will need to be adjusted if the protein's shape algorithm
    // changes.
    this.setPosition( new Vector2( attachmentPointPositionX + FULL_GROWN_WIDTH * 0.12 * this.getFullSizeProportion(),
      attachmentPointPositionY + FULL_GROWN_WIDTH * 0.45 * this.getFullSizeProportion() ) );
  },

  /**
   * @returns {Shape}
   * @private
   */
  createInitialShape: function() {
    return this.createShape( 0 );
  },

  /**
   * @param {number} growthFactor
   * @returns {Shape}
   * @private
   */
  createShape: function( growthFactor ) {
    const currentWidth = Utils.clamp( growthFactor, 0.01, 1 ) * FULL_GROWN_WIDTH;
    const path = new Shape();
    const vector = new Vector2( -currentWidth / 2, 0 );
    path.moveTo( vector.x, vector.y );
    for ( let i = 0; i < 6; i++ ) {
      vector.rotate( Math.PI / 3 );
      path.lineTo( vector.x, vector.y );
    }
    path.close();
    return path;
  }
} );