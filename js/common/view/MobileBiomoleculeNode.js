// Copyright 2015, University of Colorado Boulder

/**
 * Base class for displaying and interacting with mobile biomolecules. In essence, this observes the shape of the
 * biomolecule, which changes as it moves.
 *
 * @author Sharfudeen Ashraf
 * @author John Blanco
 * @author Aadish Gupta
 */
define( function( require ) {
  'use strict';

  // modules
  var BiomoleculeDragHandler = require( 'GENE_EXPRESSION_ESSENTIALS/common/view/BiomoleculeDragHandler' );
  var Color = require( 'SCENERY/util/Color' );
  var geneExpressionEssentials = require( 'GENE_EXPRESSION_ESSENTIALS/geneExpressionEssentials' );
  var GradientUtil = require( 'GENE_EXPRESSION_ESSENTIALS/common/util/GradientUtil' );
  var inherit = require( 'PHET_CORE/inherit' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Path = require( 'SCENERY/nodes/Path' );
  var RnaPolymerase = require( 'GENE_EXPRESSION_ESSENTIALS/common/model/RnaPolymerase' );
  var Shape = require( 'KITE/Shape' );

  /**
   * @param {ModelViewTransform2} mvt
   * @param {MobileBiomolecule} mobileBiomolecule
   * @param {number} outlineStroke
   * @constructor
   */
  function MobileBiomoleculeNode( mvt, mobileBiomolecule, options ) {
    var self = this;
    Node.call( self, { cursor: 'pointer' } );
    options = _.extend( {
      lineWidth: 1
    }, options );

    // @protected {Path} - main path that represents the biomolecule
    this.shapeNode = new Path( new Shape(), {
      stroke: Color.BLACK,
      lineWidth: options.lineWidth,
      //matrix: mvt.getMatrix()
    } );

    this.addChild( this.shapeNode );

    function handleShapeChanged( shape ) {

      if ( shape.bounds.isFinite() ) {

        if ( shape !== self.previousShape ){

          // update the shape
          self.shapeNode.shape = null;
          self.shapeNode.setShape( mvt.modelToViewShape( shape ) );
        }

        // account for the offset
        self.shapeNode.center = mvt.modelToViewPosition( mobileBiomolecule.getPosition() );
      }

      // retain the previous shape and only update the path if the shape really changed
      // TODO: This is likely temporary and will need to be removed, see https://github.com/phetsims/gene-expression-essentials/issues/86
      self.previousShape = shape;
    }

    // Update the shape whenever it changes.
    mobileBiomolecule.shapeProperty.link( handleShapeChanged );

    function handleColorChanged( color ) {

      // see the comment above on gradientPaint
      if ( self.shapeNode.shape.bounds.isFinite() ) {
        self.shapeNode.fill = GradientUtil.createGradientPaint( self.shapeNode.shape, color );
      }
    }

    //Update the color whenever it changes.
    mobileBiomolecule.colorProperty.link( handleColorChanged );

    function handleExistenceStrengthChanged( existenceStrength ) {
      assert && assert( existenceStrength >= 0 && existenceStrength <= 1 ); // Bounds checking.
      self.setOpacity( Math.min( Number( existenceStrength ), 1 + mobileBiomolecule.zPositionProperty.get() ) );
    }

    // Update its existence strength (i.e. fade level) whenever it changes.
    mobileBiomolecule.existenceStrengthProperty.link( handleExistenceStrengthChanged );

    function handleZPositionChanged( zPosition ) {
      assert && assert( zPosition >= -1 && zPosition <= 0 ); // Parameter checking.
      // The further back the biomolecule is, the more transparent it is in order to make it look more distant.
      self.setOpacity( Math.min( 1 + zPosition, mobileBiomolecule.existenceStrengthProperty.get() ) );

      // Also, as it goes further back, this node is scaled down a bit, also to make it look further away.
      self.setScaleMagnitude( 1 );
      self.setScaleMagnitude( 1 + 0.15 * zPosition );
    }

    // Update the "closeness" whenever it changes.
    mobileBiomolecule.zPositionProperty.link( handleZPositionChanged );

    function handleAttachedToDnaChanged( attachedToDna ) {
      if ( mobileBiomolecule instanceof RnaPolymerase && attachedToDna ) {
        self.moveToBack();
      }
    }

    // If a polymerase molecule attaches to the DNA strand, move it to the back of its current layer so that nothing can
    // go between it and the DNA molecule. Otherwise odd-looking things can happen.
    mobileBiomolecule.attachedToDnaProperty.link( handleAttachedToDnaChanged );

    var dragHandler = new BiomoleculeDragHandler( mobileBiomolecule, mvt );
    // Drag handling.
    this.addInputListener( dragHandler );

    function handleMovableByUserChanged( movableByUser ) {
      self.setPickable( movableByUser );
    }

    // Interactivity control.
    mobileBiomolecule.movableByUserProperty.link( handleMovableByUserChanged );

    function handleUserControlledChanged( userControlled ) {
      self.moveToFront();
    }

    // Move this biomolecule to the top of its layer when grabbed.
    mobileBiomolecule.userControlledProperty.link( handleUserControlledChanged );

    this.disposeMobileBiomoleculeNode = function() {
      mobileBiomolecule.shapeProperty.unlink( handleShapeChanged );
      mobileBiomolecule.colorProperty.unlink( handleColorChanged );
      mobileBiomolecule.existenceStrengthProperty.unlink( handleExistenceStrengthChanged );
      mobileBiomolecule.zPositionProperty.unlink( handleZPositionChanged );
      mobileBiomolecule.attachedToDnaProperty.unlink( handleAttachedToDnaChanged );
      self.removeInputListener( dragHandler );
      mobileBiomolecule.movableByUserProperty.unlink( handleMovableByUserChanged );
      mobileBiomolecule.userControlledProperty.unlink( handleUserControlledChanged );
      self.shapeNode.shape = null;
      self.shapeNode.dispose();
    };
  }

  geneExpressionEssentials.register( 'MobileBiomoleculeNode', MobileBiomoleculeNode );

  return inherit( Node, MobileBiomoleculeNode, {

    /**
     * @public
     */
    dispose: function() {
      this.disposeMobileBiomoleculeNode();
      Node.prototype.dispose.call( this );
    }

  } );
} );