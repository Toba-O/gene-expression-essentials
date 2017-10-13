// Copyright 2015-2017, University of Colorado Boulder

/**
 * Class that represents messenger ribonucleic acid, or mRNA, in the model. This class is fairly complex, due to the
 * need for mRNA to wind up and unwind as it is transcribed, translated, and destroyed.
 *
 * @author John Blanco
 * @author Mohamed Safi
 * @author Aadish Gupta
 */
define( function( require ) {
  'use strict';

  // modules
  var AttachmentSite = require( 'GENE_EXPRESSION_ESSENTIALS/common/model/AttachmentSite' );
  var FlatSegment = require( 'GENE_EXPRESSION_ESSENTIALS/common/model/FlatSegment' );
  var GEEConstants = require( 'GENE_EXPRESSION_ESSENTIALS/common/model/GEEConstants' );
  var geneExpressionEssentials = require( 'GENE_EXPRESSION_ESSENTIALS/geneExpressionEssentials' );
  var inherit = require( 'PHET_CORE/inherit' );
  var MessengerRnaAttachmentStateMachine = require( 'GENE_EXPRESSION_ESSENTIALS/common/model/attachment-state-machines/MessengerRnaAttachmentStateMachine' );
  var MessengerRnaDestroyer = require( 'GENE_EXPRESSION_ESSENTIALS/common/model/MessengerRnaDestroyer' );
  var PlacementHint = require( 'GENE_EXPRESSION_ESSENTIALS/common/model/PlacementHint' );
  var Property = require( 'AXON/Property' );
  var Ribosome = require( 'GENE_EXPRESSION_ESSENTIALS/common/model/Ribosome' );
  var Shape = require( 'KITE/Shape' );
  var Vector2 = require( 'DOT/Vector2' );
  var WindingBiomolecule = require( 'GENE_EXPRESSION_ESSENTIALS/common/model/WindingBiomolecule' );

  // constants
  var RIBOSOME_CONNECTION_DISTANCE = 400; // picometers - distance within which this will connect to a ribosome
  var MRNA_DESTROYER_CONNECT_DISTANCE = 400; // picometers - Distance within which this will connect to a mRNA destroyer
  var INITIAL_MRNA_SHAPE = Shape.circle( 0, 0, 0.1 ); // tiny circle until the strand starts to grow

  /**
   * Constructor.  This creates the mRNA as a single point, with the intention of growing it.
   *
   * @param {GeneExpressionModel} model
   * @param {Protein} proteinPrototype
   * @param {Vector2} position
   * @param {Object} options
   * @constructor
   */
  function MessengerRna( model, proteinPrototype, position, options ) {

    var self = this;

    // @private {Object} - object that maps from ribosomes to the shape segment to which they are attached
    this.mapRibosomeToShapeSegment = {};

    WindingBiomolecule.call( self, model, INITIAL_MRNA_SHAPE, position, options );

    // Externally visible indicator for whether this mRNA is being synthesized. Assumes that it is being synthesized
    // when created.
    this.beingSynthesizedProperty = new Property( true ); //@public

    // Protein prototype, used to keep track of protein that should be synthesized from this particular strand of mRNA.
    this.proteinPrototype = proteinPrototype; //@private

    // Local reference to the non-generic state machine used by this molecule.
    this.mRnaAttachmentStateMachine = this.attachmentStateMachine; // @private

    // mRNA destroyer that is destroying this mRNA. Null until and unless destruction has begun.
    this.messengerRnaDestroyer = null; //@private

    // @private - Shape segment where the mRNA destroyer is connected. This is null until destruction has begun.
    this.segmentBeingDestroyed = null; //@private

    // @private {AttachmentSite} - site where ribosomes or mRNA destroyers can attach
    this.attachmentSite = new AttachmentSite( this, new Vector2( 0, 0 ), 1 );

    // set the initial position
    this.setPosition( position );

    // Add the first segment to the shape segment list. This segment will contain the "leader" for the mRNA.
    var segment = new FlatSegment( this, Vector2.ZERO );
    segment.setCapacity( GEEConstants.LEADER_LENGTH );
    this.shapeSegments.push( segment );

    // Add the placement hints for the locations where the user can attach a ribosome or an mRNA destroyer.
    var ribosome = new Ribosome( model );
    this.ribosomePlacementHint = new PlacementHint( ribosome ); //@public(read-only)
    this.mRnaDestroyerPlacementHint = new PlacementHint( new MessengerRnaDestroyer( model ) ); //@public(read-only)

    function updateHintPositions( shape ) {

      // All hints always sit at the beginning of the RNA strand and are positioned relative to its center.
      var strandStartPosition = new Vector2( shape.bounds.minX, shape.bounds.maxY );
      self.ribosomePlacementHint.setPosition( strandStartPosition.minus( ribosome.offsetToTranslationChannelEntrance ) );
      self.mRnaDestroyerPlacementHint.setPosition( strandStartPosition );
    }

    this.shapeProperty.link( updateHintPositions );

    // update the attachment site location when the mRNA moves or changes shape
    var attachmentSiteLocationUpdater = this.updateAttachmentSitePosition.bind( this );
    this.positionProperty.link( attachmentSiteLocationUpdater );
    this.shapeProperty.link( attachmentSiteLocationUpdater );

    this.disposeMessengerRna = function() {
      this.shapeProperty.unlink( updateHintPositions );
      this.shapeProperty.unlink( attachmentSiteLocationUpdater );
      this.positionProperty.unlink( attachmentSiteLocationUpdater );
    };
  }

  geneExpressionEssentials.register( 'MessengerRna', MessengerRna );

  return inherit( WindingBiomolecule, MessengerRna, {

    /**
     * @private
     */
    dispose: function() {
      this.mapRibosomeToShapeSegment = null;
      this.disposeMessengerRna();
      WindingBiomolecule.prototype.dispose.call( this );
    },

    /**
     * Command this mRNA strand to fade away when it has become fully formed. This was created for use in the 2nd
     * screen, where mRNA is never translated once it is produced.
     * @param {boolean} fadeAwayWhenFormed
     * @public
     */
    setFadeAwayWhenFormed: function( fadeAwayWhenFormed ) {

      // Just pass this through to the state machine.
      this.mRnaAttachmentStateMachine.setFadeAwayWhenFormed( fadeAwayWhenFormed );
    },

    /**
     * Advance the translation of the mRNA through the given ribosome by the specified length. The given ribosome must
     * already be attached to the mRNA.
     *
     * @param {Ribosome} ribosome - The ribosome by which the mRNA is being translated.
     * @param {number} length   - The amount of mRNA to move through the translation channel.
     * @returns - true if the mRNA is completely through the channel, indicating, that transcription is complete, and false
     * if not.
     * @public
     */
    advanceTranslation: function( ribosome, length ) {

      var segmentToAdvance = this.mapRibosomeToShapeSegment[ ribosome.id ];

      // Error checking.
      assert && assert( segmentToAdvance !== null ); // Should never happen, since it means that the ribosome isn't attached.

      // Advance the translation by advancing the position of the mRNA in the segment that corresponds to the translation
      // channel of the ribosome.
      segmentToAdvance.advance( length, this, this.shapeSegments );

      // Realign the segments, since they may well have changed shape.
      if ( this.shapeSegments.indexOf( segmentToAdvance ) !== -1 ) {
        this.realignSegmentsFrom( segmentToAdvance );
        this.recenter();
      }

      // Since the sizes and relationships of the segments probably changed, the winding algorithm needs to be rerun.
      this.windPointsThroughSegments();

      // If there is anything left in this segment, then transcription is not yet complete.
      return segmentToAdvance.getContainedLength() <= 0;
    },

    /**
     * Advance the destruction of the mRNA by the specified length. This pulls the strand into the lead segment much like
     * translation does, but does not move the points into new segment, it just gets rid of them.
     * @param {number} length
     * @returns {boolean}
     * @public
     */
    advanceDestruction: function( length ) {

      // Error checking.
      if ( this.segmentBeingDestroyed === null ) {
        console.log( ' - Warning: Attempt to advance the destruction of mRNA that has no content left.' );
        return true;
      }

      // Advance the destruction by reducing the length of the mRNA.
      this.reduceLength( length );

      // Realign the segments, since they may well have changed shape.
      if ( this.shapeSegments.indexOf( this.segmentBeingDestroyed ) !== -1 ) {
        this.realignSegmentsFrom( this.segmentBeingDestroyed );
      }

      if ( this.shapeSegments.length > 0 ) {

        // Since the sizes and relationships of the segments probably changed, the winding algorithm needs to be rerun.
        this.windPointsThroughSegments();
      }

      // If there is any length left, then the destruction is not yet complete. This is a quick way to test this.
      return this.firstShapeDefiningPoint === this.lastShapeDefiningPoint;
    },

    /**
     * Reduce the length of the mRNA. This handles both the shape segments and the shape-defining points.
     * @param {number} reductionAmount
     * @private
     */
    reduceLength: function( reductionAmount ) {
      if ( reductionAmount >= this.getLength() ) {

        // Reduce length to be zero.
        this.lastShapeDefiningPoint = this.firstShapeDefiningPoint;
        this.lastShapeDefiningPoint.setNextPointMass( null );
        this.shapeSegments.length = 0;
      }
      else {

        // Remove the length from the shape segments.
        this.segmentBeingDestroyed.advanceAndRemove( reductionAmount, this, this.shapeSegments );

        // Remove the length from the shape defining points.
        for ( var amountRemoved = 0; amountRemoved < reductionAmount; ) {
          if ( this.lastShapeDefiningPoint.getTargetDistanceToPreviousPoint() <= reductionAmount - amountRemoved ) {

            // Remove the last point from the list.
            amountRemoved += this.lastShapeDefiningPoint.getTargetDistanceToPreviousPoint();
            this.lastShapeDefiningPoint = this.lastShapeDefiningPoint.getPreviousPointMass();
            this.lastShapeDefiningPoint.setNextPointMass( null );
          }
          else {

            // Reduce the distance of the last point from the previous point.
            this.lastShapeDefiningPoint.setTargetDistanceToPreviousPoint( this.lastShapeDefiningPoint.getTargetDistanceToPreviousPoint() - ( reductionAmount - amountRemoved ) );
            amountRemoved = reductionAmount;
          }
        }
      }
    },

    /**
     * @private
     */
    updateAttachmentSitePosition: function() {
      if ( this.shapeSegments.length > 0 ) {
        var leadingShapeSegment = this.shapeSegments[ 0 ];
        this.attachmentSite.locationProperty.set( new Vector2(
          this.positionProperty.get().x + leadingShapeSegment.bounds.minX,
          this.positionProperty.get().y + leadingShapeSegment.bounds.minY
        ) );
      }
      else {
        this.attachmentSite.positionProperty.set( this.positionProperty.get() );
      }
    },

    /**
     * Create a new version of the protein that should result when this strand of mRNA is translated.
     * @returns {Protein}
     * @public
     */
    getProteinPrototype: function() {
      return this.proteinPrototype;
    },

    /**
     * Get the point in model space where the entrance of the given ribosome's translation channel should be in order to
     * be correctly attached to this strand of messenger RNA. This allows the ribosome to "follow" the mRNA if it is
     * moving or changing shape.
     * @param {Ribosome} ribosome
     * @returns {Vector2}
     * @public
     */
    getRibosomeAttachmentLocation: function( ribosome ) {
      assert && assert(
        this.mapRibosomeToShapeSegment[ ribosome.id ],
        'attempt made to get attachment location for unattached ribosome'
      );
      var attachmentLocation;
      var mRnaPosition = this.positionProperty.get();
      var segment = this.mapRibosomeToShapeSegment[ ribosome.id ];
      if ( this.getPreviousShapeSegment( segment ) === null ) {

        // There is no previous segment, which means that the segment to which this ribosome is attached is the leader
        // segment. The attachment point is thus the leader length from its rightmost edge.
        attachmentLocation = new Vector2(
          mRnaPosition.x + segment.getLowerRightCornerPosition().x - GEEConstants.LEADER_LENGTH,
          mRnaPosition.y + segment.getLowerRightCornerPosition().y
        );
      }
      else {

        // The segment has filled up the channel, so calculate the position based on its left edge.
        attachmentLocation = new Vector2(
          mRnaPosition.x + segment.getUpperLeftCornerPosition().x + ribosome.getTranslationChannelLength(),
          mRnaPosition.y + segment.getUpperLeftCornerPosition().y
        );
      }
      return attachmentLocation;
    },

    /**
     * Release this mRNA from a ribosome. If this is the only ribosome to which the mRNA is connected, the mRNA will
     * start wandering.
     * @param {Ribosome} ribosome
     * @public
     */
    releaseFromRibosome: function( ribosome ) {
      delete this.mapRibosomeToShapeSegment[ ribosome.id ];
      if ( _.keys( this.mapRibosomeToShapeSegment ).length === 0 ) {
        this.mRnaAttachmentStateMachine.allRibosomesDetached();
      }
    },

    /**
     * Release this mRNA from the polymerase which is, presumably, transcribing it.
     * @public
     */
    releaseFromPolymerase: function() {
      this.mRnaAttachmentStateMachine.detach();
    },

    /**
     * Activate the placement hint(s) as appropriate for the given biomolecule.
     *
     * @param {MobileBiomolecule} biomolecule - instance of the type of biomolecule for which any matching hints
     * should be activated.
     * @public
     */
    activateHints: function( biomolecule ) {
      this.ribosomePlacementHint.activateIfMatch( biomolecule );
      this.mRnaDestroyerPlacementHint.activateIfMatch( biomolecule );
    },

    /**
     * Deactivate placement hints for all biomolecules
     * @public
     */
    deactivateAllHints: function() {
      this.ribosomePlacementHint.activeProperty.set( false );
      this.mRnaDestroyerPlacementHint.activeProperty.set( false );
    },

    /**
     * Initiate the translation process by setting up the segments as needed. This should only be called after a ribosome
     * that was moving to attach with this mRNA arrives at the attachment point.
     * @param {Ribosome} ribosome
     * @public
     */
    initiateTranslation: function( ribosome ) {
      assert && assert( this.mapRibosomeToShapeSegment[ ribosome.id ] ); // State checking.

      // Set the capacity of the first segment to the size of the channel through which it will be pulled plus the leader
      // length.
      var firstShapeSegment = this.shapeSegments[ 0 ];
      assert && assert( firstShapeSegment.isFlat() );
      firstShapeSegment.setCapacity( ribosome.getTranslationChannelLength() + GEEConstants.LEADER_LENGTH );
    },

    /**
     * Initiate the destruction of this mRNA strand by setting up the segments as needed. This should only be called
     * after an mRNA destroyer has attached to the front of the mRNA strand. Once initiated, destruction cannot be stopped.
     * @param {MessengerRnaDestroyer} messengerRnaDestroyer
     * @public
     */
    initiateDestruction: function( messengerRnaDestroyer ) {
      assert && assert( this.messengerRnaDestroyer === messengerRnaDestroyer ); // Shouldn't get this from unattached destroyers.

      // Set the capacity of the first segment to the size of the channel through which it will be pulled plus the leader length.
      this.segmentBeingDestroyed = this.shapeSegments[ 0 ];

      assert && assert( this.segmentBeingDestroyed.isFlat() );
      this.segmentBeingDestroyed.setCapacity(
        this.messengerRnaDestroyer.getDestructionChannelLength() + GEEConstants.LEADER_LENGTH
      );
    },

    /**
     * Get the proportion of the entire mRNA that has been translated by the given ribosome.
     * @param {Ribosome} ribosome
     * @returns {number}
     * @public
     */
    getProportionOfRnaTranslated: function( ribosome ) {
      var translatedLength = this.getLengthOfRnaTranslated( ribosome );
      return Math.max( translatedLength / this.getLength(), 0 );
    },

    /**
     * Get the length of the mRNA that has been translated by the given ribosome.
     * @param {Ribosome} ribosome
     * @returns {number}
     * @public
     */
    getLengthOfRnaTranslated: function( ribosome ) {
      assert && assert( this.mapRibosomeToShapeSegment[ ribosome.id ] ); // Makes no sense if ribosome isn't attached.
      var translatedLength = 0;
      var segmentInRibosomeChannel = this.mapRibosomeToShapeSegment[ ribosome.id ];

      assert && assert( segmentInRibosomeChannel.isFlat() ); // Make sure things are as we expect.

      // Add the length for each segment that precedes this ribosome.
      for ( var i = 0; i < this.shapeSegments.length; i++ ) {
        var shapeSegment = this.shapeSegments[ i ];
        if ( shapeSegment === segmentInRibosomeChannel ) {
          break;
        }
        translatedLength += shapeSegment.getContainedLength();
      }

      // Add the length for the segment that is inside the translation channel of this ribosome.
      translatedLength += segmentInRibosomeChannel.getContainedLength() -
                          ( segmentInRibosomeChannel.getLowerRightCornerPosition().x -
                          segmentInRibosomeChannel.attachmentSite.locationProperty.get().x );

      return translatedLength;
    },

    /**
     * Consider proposal from ribosome, and, if the proposal is accepted, return the attachment location
     * @param {Ribosome} ribosome
     * @returns {AttachmentSite}
     * @public
     */
    considerProposalFromRibosome: function( ribosome ) {
      assert && assert( !this.mapRibosomeToShapeSegment[ ribosome.id ] ); // Shouldn't get redundant proposals from a ribosome.
      var returnValue = null;

      // Can't consider proposal if currently being destroyed.
      if ( this.messengerRnaDestroyer === null ) {

        // See if the attachment site at the leading edge of the mRNA is available and close by.
        if ( this.attachmentSite.attachedOrAttachingMoleculeProperty.get() === null &&
             this.attachmentSite.locationProperty.get().distance( ribosome.getEntranceOfRnaChannelPosition() ) < RIBOSOME_CONNECTION_DISTANCE ) {

          // This attachment site is in range and available.
          returnValue = this.attachmentSite;

          // Update the attachment state machine.
          this.mRnaAttachmentStateMachine.attachedToRibosome();

          // Enter this connection in the map.
          this.mapRibosomeToShapeSegment[ ribosome.id ] = this.shapeSegments[ 0 ];
        }
      }
      return returnValue;
    },

    /**
     * Consider proposal from mRnaDestroyer and if it can attach return the attachment location
     * @param {MessengerRnaDestroyer} messengerRnaDestroyer
     * @returns {AttachmentSite}
     * @public
     */
    considerProposalFromMessengerRnaDestroyer: function( messengerRnaDestroyer ) {
      assert && assert( this.messengerRnaDestroyer !== messengerRnaDestroyer ); // Shouldn't get redundant proposals from same destroyer.

      var returnValue = null;

      // Make sure that this mRNA is not already being destroyed.
      if ( this.messengerRnaDestroyer === null ) {

        // See if the attachment site at the leading edge of the mRNA is available and close by.
        if ( this.attachmentSite.attachedOrAttachingMoleculeProperty.get() === null &&
             this.attachmentSite.locationProperty.get().distance(
               messengerRnaDestroyer.getPosition() ) < MRNA_DESTROYER_CONNECT_DISTANCE ) {

          // This attachment site is in range and available.
          returnValue = this.attachmentSite;

          // Update the attachment state machine.
          this.mRnaAttachmentStateMachine.attachToDestroyer();

          // Keep track of the destroyer.
          this.messengerRnaDestroyer = messengerRnaDestroyer;
        }
      }

      return returnValue;
    },

    /**
     * Aborts the destruction process, used if the mRNA destroyer was on its way to the mRNA but the user picked it up
     * before it got there.
     * @public
     */
    abortDestruction: function() {
      this.messengerRnaDestroyer = null;
      this.attachmentStateMachine.forceImmediateUnattachedAndAvailable();
    },

    /**
     * @override
     * @returns {MessengerRnaAttachmentStateMachine}
     * @public
     */
    createAttachmentStateMachine: function() {
      return new MessengerRnaAttachmentStateMachine( this );
    },

    /**
     * Get the point in model space where the entrance of the given destroyer's translation channel should be in order to
     * be correctly attached to this strand of messenger RNA.
     * @returns {Vector2}
     * @public
     */
    getDestroyerAttachmentLocation: function() {
      
      // state checking - shouldn't be called before this is set
      assert && assert( this.segmentBeingDestroyed !== null );

      // the attachment location is at the right most side of the segment minus the leader length
      return this.attachmentSite.locationProperty.get();
    }
  } );
} );
