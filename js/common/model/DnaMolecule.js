//  Copyright 2002-2014, University of Colorado Boulder
/**
 * This class models a molecule of DNA in the model.  It includes the shape of
 * the two "backbone" strands of the DNA and the individual base pairs, defines
 * where the various genes reside, and retains other information about the DNA
 * molecule.  This is an important and central object in the model for this
 * simulation.
 *
 * A big simplifying assumption that this class makes is that molecules that
 * attach to the DNA do so to individual base pairs.  In reality, biomolecules
 * attach to groups of base pairs, the exact configuration of which dictate
 * where biomolecules attach. This was unnecessarily complicated for the needs
 * of this sim.

 * @author Sharfudeen Ashraf
 * @author John Blanco
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var CommonConstants = require( 'GENE_EXPRESSION_BASICS/common/model/CommonConstants' );
  var AttachmentSite = require( 'GENE_EXPRESSION_BASICS/common/model/AttachmentSite' );
  var Util = require( 'DOT/Util' );
  var Vector2 = require( 'DOT/Vector2' );
  var BioShapeUtils = require( 'GENE_EXPRESSION_BASICS/common/model/BioShapeUtils' );
  var IntegerRange = require( 'GENE_EXPRESSION_BASICS/common/util/IntegerRange' );
  var BasePair = require( 'GENE_EXPRESSION_BASICS/common/model/BasePair' );
  var Matrix3 = require( 'DOT/Matrix3' );
  var DnaStrandSegment = require( 'GENE_EXPRESSION_BASICS/common/model/DnaStrandSegment' );
  var DnaStrandPoint = require( 'GENE_EXPRESSION_BASICS/common/model/DnaStrandPoint' );

  // constants
  // Distance within which transcription factors may attach.
  var TRANSCRIPTION_FACTOR_ATTACHMENT_DISTANCE = 400;

  // Distance within which RNA polymerase may attach.
  var RNA_POLYMERASE_ATTACHMENT_DISTANCE = 400;

  /**
   * @param {GeneExpressionModel} model //  The gene expression model within which this DNA strand exists.
   * Needed for evaluation of biomolecule interaction.
   *
   * @param {number} numBasePairs - number of base pairs in the strand
   *
   * @param {number} leftEdgeXOffset - x position in model space of the left side of
   * the molecule.  Y position is assumed to be zero.
   *
   * @param {boolean} pursueAttachments - flag that controls whether the DNA strand
   * actively pulls in transcription factors and polymerase, or just lets them drift into place.
   *
   * @constructor
   */
  function DnaMolecule( model, numBasePairs, leftEdgeXOffset, pursueAttachments ) {
    this.model = model;
    this.leftEdgeXOffset = leftEdgeXOffset;
    this.pursueAttachments = pursueAttachments; // Flag that controls active pursual of transcription factors and polymerase.
    this.moleculeLength = numBasePairs * CommonConstants.DISTANCE_BETWEEN_BASE_PAIRS;
    this.numberOfTwists = this.moleculeLength / CommonConstants.LENGTH_PER_TWIST;

    // Points that, when connected, define the shape of the DNA strands.
    this.strandPoints = []; // Array of DnaStrandPoint

    // The backbone strands that are portrayed in the view, which consist of lists of shapes.
    // This is done so that the shapes can be colored differently and layered in order to create a "twisted" look.
    this.strand1Segments = []; // Array of DnaStrandSegment
    this.strand2Segments = []; // Array of DnaStrandSegment

    // Base pairs within the DNA strand.
    this.basePairs = []; // Array of BasePair

    this.genes = [];// Array of Genes on this strand of DNA. // private

    // List of forced separations between the two strands.
    this.separations = [];//  Array of DnaSeparation // private

    // Add the initial set of shape-defining points for each of the two
    // strands.  Points are spaced the same as the base pairs.
    for ( var i = 0; i < this.moleculeLength / CommonConstants.DISTANCE_BETWEEN_BASE_PAIRS; i++ ) {
      var xPos = leftEdgeXOffset + i * CommonConstants.DISTANCE_BETWEEN_BASE_PAIRS;
      this.strandPoints.push( new DnaStrandPoint( xPos, this.getDnaStrandYPosition( xPos, 0 ),
        this.getDnaStrandYPosition( xPos, CommonConstants.INTER_STRAND_OFFSET ) ) );
    }

    // Shadow of the points that define the strand shapes, used for rapid
    // evaluation of any shape changes.
    // Create a shadow of the shape-defining points.  This will be used for detecting shape changes.
    this.strandPointsShadow = [];

    for ( var j = 0; j < this.strandPoints.length; j++ ) {
      var strandPoint = this.strandPoints[ j ];
      this.strandPointsShadow.push( new DnaStrandPoint( strandPoint ) );
    }

    // Create the sets of segments that will be observed by the view.
    this.initializeStrandSegments();

    // Add in the base pairs between the backbone strands.  This calculates the distance between the
    // two strands and puts a line between them in  order to look like the base pair.
    var basePairXPos = leftEdgeXOffset;
    while ( basePairXPos <= this.strandPoints[ this.strandPoints.length - 1 ].xPos ) {
      var strand1YPos = this.getDnaStrandYPosition( basePairXPos, 0 );
      var strand2YPos = this.getDnaStrandYPosition( basePairXPos, CommonConstants.INTER_STRAND_OFFSET );
      var height = Math.abs( strand1YPos - strand2YPos );
      var basePairYPos = ( strand1YPos + strand2YPos ) / 2;
      this.basePairs.push( new BasePair( new Vector2( basePairXPos, basePairYPos ), height ) );
      basePairXPos += CommonConstants.DISTANCE_BETWEEN_BASE_PAIRS;
    }
  }

  return inherit( Object, DnaMolecule, {

    /**
     * private
     * Get the index of the nearest base pair given an X position in model space.
     *
     * @param {number} xOffset
     * @returns {number}
     */
    getBasePairIndexFromXOffset: function( xOffset ) {
      // assert xOffset >= leftEdgeXOffset && xOffset < leftEdgeXOffset + moleculeLength;
      xOffset = Util.clamp( xOffset, this.leftEdgeXOffset, this.leftEdgeXOffset + CommonConstants.LENGTH_PER_TWIST * this.numberOfTwists );
      return (Math.round( ( xOffset - this.leftEdgeXOffset - CommonConstants.INTER_STRAND_OFFSET ) / CommonConstants.DISTANCE_BETWEEN_BASE_PAIRS )) | 0; // make it int

    },

    /**
     * private
     * Get the X location of the nearest base pair given an arbitrary x location.
     * @param {number} xPos
     * @returns {number}
     */
    getNearestBasePairXOffset: function( xPos ) {
      return this.getBasePairXOffsetByIndex( this.getBasePairIndexFromXOffset( xPos ) );
    },


    /**
     * Initialize the DNA stand segment lists.
     * private
     */
    initializeStrandSegments: function() {
      var self = this;
      var strand1SegmentPoints = []; //ArrayList<Point2D> TODO
      var strand2SegmentPoints = [];
      var segmentStartX = this.strandPoints[ 0 ].xPos;
      var strand1InFront = true;
      _.forEach( this.strandPoints, function( dnaStrandPoint ) {
        var xPos = dnaStrandPoint.xPos;
        strand1SegmentPoints.push( new Vector2( xPos, dnaStrandPoint.strand1YPos ) );
        strand2SegmentPoints.push( new Vector2( xPos, dnaStrandPoint.strand2YPos ) );
        if ( xPos - segmentStartX >= ( CommonConstants.LENGTH_PER_TWIST / 2 ) ) {

          // Time to add these segments and start a new ones.
          self.strand1Segments.push( new DnaStrandSegment( BioShapeUtils.createCurvyLineFromPoints( strand1SegmentPoints ), strand1InFront ) );
          self.strand2Segments.push( new DnaStrandSegment( BioShapeUtils.createCurvyLineFromPoints( strand2SegmentPoints ), !strand1InFront ) );
          var firstPointOfNextSegment = strand1SegmentPoints[ strand1SegmentPoints.length - 1 ];
          strand1SegmentPoints = []; // clear;
          strand1SegmentPoints.push( firstPointOfNextSegment ); // This point must be on this segment too in order to prevent gaps.
          firstPointOfNextSegment = strand2SegmentPoints[ strand2SegmentPoints.length - 1 ];
          strand2SegmentPoints = []; //clear;
          strand2SegmentPoints.push( firstPointOfNextSegment ); // This point must be on this segment too in order to prevent gaps.
          segmentStartX = firstPointOfNextSegment.x;
          strand1InFront = !strand1InFront;
        }
      } );
    },

    /**
     * Get the Y position in model space for a DNA strand for the given X
     * position and offset.  The offset acts like a "phase difference", thus
     * allowing this method to be used to get location information for both
     * DNA strands.
     *
     * @param {number} xPos
     * @param {number} offset
     * @return {number}
     */
    getDnaStrandYPosition: function( xPos, offset ) {
      return Math.sin( ( xPos + offset ) / CommonConstants.LENGTH_PER_TWIST * Math.PI * 2 ) * CommonConstants.DNA_MOLECULE_DIAMETER / 2;
    },

    /**
     * private
     * Update the strand segment shapes based on things that might have
     * changed, such as biomolecules attaching and separating the strands or
     * otherwise deforming the nominal double-helix shape.
     */
    updateStrandSegments: function() {
      var thisMolecule = this;
      // Set the shadow points to the nominal, non-deformed positions.
      _.forEach( this.strandPointsShadow, function( dnaStrandPoint ) {
        dnaStrandPoint.strand1YPos = thisMolecule.getDnaStrandYPosition( dnaStrandPoint.xPos, 0 );
        dnaStrandPoint.strand2YPos = thisMolecule.getDnaStrandYPosition( dnaStrandPoint.xPos, CommonConstants.INTER_STRAND_OFFSET );
      } );

      // Move the shadow points to account for any separations.
      _.forEach( this.separations, function( separation ) {
        var windowWidth = separation.getAmount() * 1.5; // Make the window wider than it is high.  This was chosen to look decent, tweak if needed.
        var separationWindowXIndexRange = new IntegerRange( Math.floor( ( separation.getXPos() - ( windowWidth / 2 ) -
                                                                          thisMolecule.leftEdgeXOffset ) / CommonConstants.DISTANCE_BETWEEN_BASE_PAIRS ) | 0,
          Math.floor( ( separation.getXPos() + ( windowWidth / 2 ) - thisMolecule.leftEdgeXOffset ) / CommonConstants.DISTANCE_BETWEEN_BASE_PAIRS ) | 0 );
        for ( var i = separationWindowXIndexRange.getMin(); i < separationWindowXIndexRange.getMax(); i++ ) {
          var windowCenterX = ( separationWindowXIndexRange.getMin() + separationWindowXIndexRange.getMax() ) / 2;
          if ( i >= 0 && i < thisMolecule.strandPointsShadow.length ) {

            // Perform a windowing algorithm that weights the separation
            // at 1 in the center, 0 at the edges, and linear
            // graduations in between.  By
            var separationWeight = 1 - Math.abs( 2 * ( i - windowCenterX ) / separationWindowXIndexRange.getLength() );
            thisMolecule.strandPointsShadow[ i ].strand1YPos = ( 1 - separationWeight ) * thisMolecule.strandPointsShadow[ i ].strand1YPos +
                                                               separationWeight * separation.getAmount() / 2;
            thisMolecule.strandPointsShadow[ i ].strand2YPos = ( 1 - separationWeight ) * thisMolecule.strandPointsShadow[ i ].strand2YPos -
                                                               separationWeight * separation.getAmount() / 2;
          }
        }
      } );

      // See if any of the points have moved and, if so, update the
      // corresponding shape segment.
      var numSegments = this.strand1Segments.length;
      for ( var i = 0; i < numSegments; i++ ) {
        var segmentChanged = false;
        var strand1Segment = this.strand1Segments[ i ];
        var strand2Segment = this.strand2Segments[ i ];

        // Determine the bounds of the current segment.  Assumes that the
        // bounds for the strand1 and strand2 segments are the same, which
        // should be a safe assumption.
        var bounds = strand1Segment.getShape().bounds;
        var pointIndexRange = new IntegerRange( Math.floor( ( bounds.getMinX() - this.leftEdgeXOffset ) / CommonConstants.DISTANCE_BETWEEN_BASE_PAIRS ) | 0,
          Math.floor( ( bounds.getMaxX() - this.leftEdgeXOffset ) / CommonConstants.DISTANCE_BETWEEN_BASE_PAIRS ) | 0 );

        // Check to see if any of the points within the identified range
        // have changed and, if so, update the corresponding segment shape
        // in the strands.  If the points for either strand has changed,
        // both are updated.
        for ( var j = pointIndexRange.getMin(); j <= pointIndexRange.getMax(); j++ ) {
          if ( !this.strandPoints[ j ].equals( this.strandPointsShadow[ j ] ) ) {

            // The point has changed.  Update it, mark the change.
            this.strandPoints[ j ].set( this.strandPointsShadow[ j ] );
            segmentChanged = true;
          }
        }

        if ( segmentChanged ) {

          // Update the shape of this segment.
          var strand1ShapePoints = [];
          var strand2ShapePoints = [];
          for ( var k = pointIndexRange.getMin(); k <= pointIndexRange.getMax(); k++ ) {
            //for performance reasons using object literals instead of Vector instances
            strand1ShapePoints.push( { x: this.strandPoints[ k ].xPos, y: this.strandPoints[ k ].strand1YPos } );
            strand2ShapePoints.push( { x: this.strandPoints[ k ].xPos, y: this.strandPoints[ k ].strand2YPos } );
          }
          strand1Segment.setShape( BioShapeUtils.createCurvyLineFromPoints( strand1ShapePoints ) );
          strand2Segment.setShape( BioShapeUtils.createCurvyLineFromPoints( strand2ShapePoints ) );
        }
      }
    },

    /**
     *
     * @param {number} dt
     */
    stepInTime: function( dt ) {
      this.updateStrandSegments();
      _.forEach( this.genes, function( gene ) {
        gene.updateAffinities();
      } );
    },

    /**
     * @returns {number}
     */
    getLength: function() {
      return this.moleculeLength;
    },

    /**
     * Add a gene to the DNA strand.  Adding a gene essentially defines it,
     * since in this sim, the base pairs don't actually encode anything, so
     * adding the gene essentially delineates where it is on the strand.
     *
     * @param {Gene} geneToAdd Gene to add to the DNA strand.
     */
    addGene: function( geneToAdd ) {
      this.genes.push( geneToAdd );
    },

    /**
     * Get the X position of the specified base pair.  The first base pair at
     * the left side of the DNA molecule is base pair 0, and it goes up from
     * there.
     *
     * @param {number} basePairNumber
     * @returns {number}
     */
    getBasePairXOffsetByIndex: function( basePairNumber ) {
      return this.leftEdgeXOffset + CommonConstants.INTER_STRAND_OFFSET +
             basePairNumber * CommonConstants.DISTANCE_BETWEEN_BASE_PAIRS;
    },

    /**
     * @param {DnaSeparation} separation
     */
    addSeparation: function( separation ) {
      this.separations.push( separation );
    },

    /**
     * @param {DnaSeparation} separation
     */
    removeSeparation: function( separation ) {
      if ( !_.contains( this.separations, separation ) ) {
        console.log( " - Warning: Ignoring attempt to remove separation that can't be found." );
      }
      else {
        _.remove( this.separations, function( value ) {
          return separation === value;
        } );
      }
    },

    /**
     * @returns {Array <DnaStrandSegment>}
     */
    getStrand1Segments: function() {
      return this.strand1Segments;
    },

    /**
     * @returns {Array <DnaStrandSegment>}
     */
    getStrand2Segments: function() {
      return this.strand2Segments;
    },

    /**
     * @returns {Array <Gene>}
     */
    getGenes: function() {
      return this.genes;
    },

    /**
     * @returns {Gene}
     */
    getLastGene: function() {
      return this.genes[ this.genes.length - 1 ];
    },

    /**
     * @returns {Array <BasePair>}
     */
    getBasePairs: function() {
      return this.basePairs;
    },

    /**
     * @param {MobileBiomolecule} biomolecule
     */
    activateHints: function( biomolecule ) {
      _.forEach( this.genes, function( gene ) {
        gene.activateHints( biomolecule );
      } );
    },

    deactivateAllHints: function() {
      _.forEach( this.genes, function( gene ) {
        gene.deactivateHints();
      } );

    },

    /**
     * Get the position in model space of the leftmost edge of the DNA strand.
     * The Y position is in the vertical center of the strand.
     *
     * @returns {Vector2}
     */
    getLeftEdgePos: function() {
      return new Vector2( this.leftEdgeXOffset, CommonConstants.DNA_MOLECULE_Y_POS );
    },


    /**
     * Consider an attachment proposal from a transcription factor instance.
     * To determine whether or not to accept or reject this proposal, the base
     * pairs are scanned in order to determine whether there is an appropriate
     * and available attachment site within the attachment distance.
     * or Consider an attachment proposal from an instance of RNA polymerase.
     *
     * @param {TranscriptionFactor} transcriptionFactor
     * @return {AttachmentSite}
     */
    considerProposalFromByTranscriptionFactor: function( transcriptionFactor ) {
      var self = this;
      return this.considerProposalFromBiomolecule( transcriptionFactor, TRANSCRIPTION_FACTOR_ATTACHMENT_DISTANCE,
        function( basePairIndex ) {
          return self.getTranscriptionFactorAttachmentSiteForBasePairIndex( basePairIndex, transcriptionFactor.getConfig() );
        },
        function( gene ) {
          return true; // TFs can always attach if a spot is available.
        },
        function( gene ) {
          return gene.getMatchingSite( transcriptionFactor.getConfig() );
        }
      );

    },

    /**
     * @param {RnaPolymerase} rnaPolymerase
     * @returns {AttachmentSite}
     */
    considerProposalFromByRnaPolymerase: function( rnaPolymerase ) {
      var self = this;
      return this.considerProposalFromBiomolecule( rnaPolymerase, RNA_POLYMERASE_ATTACHMENT_DISTANCE,
        function( basePairIndex ) {
          return self.getRnaPolymeraseAttachmentSiteForBasePairIndex( basePairIndex );
        },
        function( gene ) {
          return gene.transcriptionFactorsSupportTranscription();
        },
        function( gene ) {
          return gene.getPolymeraseAttachmentSite();
        }
      );

    },

    /**
     * @private
     * Consider a proposal from a biomolecule.  This is the generic version
     * that avoids duplicated code.
     * @param {MobileBiomolecule} biomolecule
     * @param {number} maxAttachDistance
     * @param {Function<Integer>} getAttachSiteForBasePair
     * @param {Function<Gene>} isOkayToAttach
     * @param {Function<Gene>} getAttachmentSite
     * @returns {*}
     */
    considerProposalFromBiomolecule: function( biomolecule, maxAttachDistance, getAttachSiteForBasePair, isOkayToAttach,
                                               getAttachmentSite ) {
      var potentialAttachmentSites = [];
      for ( var i = 0; i < this.basePairs.length; i++ ) {
        // See if the base pair is within the max attachment distance.
        var attachmentSiteLocation = new Vector2( this.basePairs[ i ].getCenterLocation().x, CommonConstants.DNA_MOLECULE_Y_POS );
        if ( attachmentSiteLocation.distance( biomolecule.getPosition() ) <= maxAttachDistance ) {
          // In range.  Add it to the list if it is available.
          var potentialAttachmentSite = getAttachSiteForBasePair( i );
          if ( potentialAttachmentSite.attachedOrAttachingMolecule === null ) {
            potentialAttachmentSites.push( potentialAttachmentSite );
          }
        }
      }

      // If there aren't any potential attachment sites in range, check for
      // a particular set of conditions under which the DNA provides an
      // attachment site anyways.
      if ( potentialAttachmentSites.length === 0 && this.pursueAttachments ) {
        _.forEach( this.genes, function( gene ) {
          if ( isOkayToAttach( gene ) ) {
            var matchingSite = getAttachmentSite( gene );

            // Found a matching site on a gene.
            if ( matchingSite.attachedOrAttachingMolecule === null ) {

              // The site is unoccupied, so add it to the list of  potential sites.
              potentialAttachmentSites.push( matchingSite );
            }
            else if ( !matchingSite.isMoleculeAttached() ) {
              var thisDistance = biomolecule.getPosition().distance( matchingSite.location );
              var thatDistance = matchingSite.attachedOrAttachingMolecule.getPosition().distance(
                matchingSite.location );
              if ( thisDistance < thatDistance ) {

                // The other molecule is not yet attached, and this one is closer, so force the other molecule to
                // abort its pending attachment.
                matchingSite.attachedOrAttachingMolecule.forceAbortPendingAttachment();

                // Add this site to the list of potential sites.
                potentialAttachmentSites.push( matchingSite );
              }
            }

          }

        } );

      }// if

      // Eliminate sites that would put the molecule out of bounds or
      // would overlap with other attached biomolecules.
      potentialAttachmentSites = this.eliminateInvalidAttachmentSites( biomolecule, potentialAttachmentSites );
      if ( potentialAttachmentSites.length === 0 ) {

        // No acceptable sites found.
        return null;
      }

      var exponent = 1;
      var attachLocation = biomolecule.getPosition();

      // Sort the collection so that the best site is at the top of the list.
      potentialAttachmentSites = _.sortBy( potentialAttachmentSites, function( attachmentSite ) {

        // The comparison is based on a combination of the affinity and the
        // distance, much like gravitational attraction.  The exponent
        // effectively sets the relative weighting of one versus another.
        // An exponent value of zero means only the affinity matters, a
        // value of 100 means it is pretty much entirely distance.  A value
        // of 2 is how gravity works, so it appears kind of natural.  Tweak
        // as needed.
        var as1Factor = attachmentSite.getAffinity() / Math.pow( attachLocation.distance(
            attachmentSite.location ), exponent );
        return as1Factor;
      } );

      potentialAttachmentSites = potentialAttachmentSites.reverse();

      // Return the optimal attachment site.
      return potentialAttachmentSites[ 0 ];
    },

    /**
     * @private
     * Take a list of attachment sites and eliminate any of them that, if the
     * given molecule attaches, it would end up out of bounds or overlapping
     * with another biomolecule that is already attached to the DNA strand.
     *
     * @param  {MobileBiomolecule} biomolecule     -         The biomolecule that is potentially going to
     *                                 attach to the provided list of attachment sites.
     * @param {Array} potentialAttachmentSites -  Attachment sites where the given
     *                                 biomolecule could attach.
     */
    eliminateInvalidAttachmentSites: function( biomolecule, potentialAttachmentSites ) {
      var self = this;
      return _.filter( potentialAttachmentSites, function( attachmentSite ) {
        var translationVector = attachmentSite.location.minus( biomolecule.getPosition() );
        var transform = Matrix3.translation( translationVector.x, translationVector.y );
        var translatedShape = biomolecule.getShape().transformed( transform );
        var inBounds = biomolecule.motionBounds.inBounds( translatedShape );
        var overlapsOtherMolecules = false;
        var list = self.model.getOverlappingBiomolecules( translatedShape );
        for ( var i = 0; i < list.length; i++ ) {
          var mobileBiomolecule = list[ i ];
          if ( mobileBiomolecule.attachedToDna && mobileBiomolecule !== biomolecule ) {
            overlapsOtherMolecules = true;
            break;
          }
        }
        return inBounds && !overlapsOtherMolecules;

      } );
    },

    /**
     * @private
     * @param {MobileBiomolecule} biomolecule
     * @param {Array<AttachmentSite>} potentialAttachmentSites
     * @returns {Array<AttachmentSite>}
     */
    eliminateOverlappingAttachmentSitesNew: function( biomolecule, potentialAttachmentSites ) {
      return _.filter( potentialAttachmentSites, function( attachmentSite ) {
        var translationVector = attachmentSite.location.minus( biomolecule.getPosition() );
        var transform = Matrix3.translation( translationVector.x, translationVector.y );
        var translatedShape = biomolecule.getShape().transformed( transform );
        return biomolecule.motionBoundsProperty.get().inBounds( translatedShape );
      } );

    },

    /**
     * @private
     * @param {number} i
     * @param {TranscriptionFactorConfig} tfConfig
     * @returns {AttachmentSite}
     */
    getTranscriptionFactorAttachmentSiteForBasePairIndex: function( i, tfConfig ) {
      // See if this base pair is inside a gene.
      var gene = this.getGeneContainingBasePair( i );
      var attachmentSite = null;

      if ( gene !== null ) {
        // Base pair is in a gene, so get it from the gene.
        attachmentSite = gene.getTranscriptionFactorAttachmentSite( i, tfConfig );
      }
      else {
        // Base pair is not contained within a gene, so use the default.
        attachmentSite = this.createDefaultAffinityAttachmentSiteByInt( i );
      }

      return attachmentSite;
    },


    /**
     * @private
     * @param {number} i
     * @returns {AttachmentSite}
     */
    getRnaPolymeraseAttachmentSiteForBasePairIndex: function( i ) {
      // See if this base pair is inside a gene.
      var gene = this.getGeneContainingBasePair( i );
      if ( gene !== null ) {
        // Base pair is in a gene.  See if site is available.
        return gene.getPolymeraseAttachmentSite( i );
      }
      else {
        // Base pair is not contained within a gene, so use the default.
        return this.createDefaultAffinityAttachmentSiteByInt( i );
      }
    },

    /**
     * Get the two base pair attachment sites that are next to the provided
     * one, i.e. the one before it on the DNA strand and the one after it.  If
     * at one end of the strand, only one site will be returned.  Occupied
     * sites are not returned.
     *
     * @param {TranscriptionFactor} transcriptionFactor
     * @param {AttachmentSite} attachmentSite
     * @returns {Array <AttachmentSite>}
     */
    getAdjacentAttachmentSitesTranscriptionFactor: function( transcriptionFactor, attachmentSite ) {
      var basePairIndex = this.getBasePairIndexFromXOffset( attachmentSite.locationProperty.get().x );
      var attachmentSites = [];
      var potentialSite;
      if ( basePairIndex !== 0 ) {
        potentialSite = this.getTranscriptionFactorAttachmentSiteForBasePairIndex( basePairIndex - 1,
          transcriptionFactor.getConfig() );
        if ( potentialSite.attachedOrAttachingMolecule === null ) {
          attachmentSites.push( potentialSite );
        }
      }
      if ( basePairIndex !== this.basePairs.length - 1 ) {
        potentialSite = this.getTranscriptionFactorAttachmentSiteForBasePairIndex( basePairIndex + 1,
          transcriptionFactor.getConfig() );
        if ( potentialSite.attachedOrAttachingMolecule === null ) {
          attachmentSites.push( potentialSite );
        }
      }

      return this.eliminateInvalidAttachmentSites( transcriptionFactor, attachmentSites );
    },

    /**
     * Get the two base pair attachment sites that are next to the provided
     * one, i.e. the one before it on the DNA strand and the one after it.  If
     * at one end of the strand, only one site will be returned.  Occupied
     * sites are not returned.
     *
     * @param {RnaPolymerase} rnaPolymerase
     * @param  {AttachmentSite} attachmentSite
     * @returns {Array <AttachmentSite>}
     */
    getAdjacentAttachmentSitesRnaPolymerase: function( rnaPolymerase, attachmentSite ) {
      var basePairIndex = this.getBasePairIndexFromXOffset( attachmentSite.locationProperty.get().x );
      var attachmentSites = [];
      var potentialSite;
      if ( basePairIndex !== 0 ) {
        potentialSite = this.getRnaPolymeraseAttachmentSiteForBasePairIndex( basePairIndex - 1 );
        if ( potentialSite.attachedOrAttachingMolecule === null ) {
          attachmentSites.push( potentialSite );
        }
      }
      if ( basePairIndex !== this.basePairs.length - 1 ) {
        potentialSite = this.getRnaPolymeraseAttachmentSiteForBasePairIndex( basePairIndex + 1 );
        if ( potentialSite.attachedOrAttachingMolecule === null ) {
          attachmentSites.push( potentialSite );
        }
      }

      // Eliminate sites that would put the molecule out of bounds or
      // would overlap with other attached biomolecules.
      return this.eliminateInvalidAttachmentSites( rnaPolymerase, attachmentSites );
    },

    /**
     * @private
     * @param {number} basePairIndex
     * @returns {Gene}
     */
    getGeneContainingBasePair: function( basePairIndex ) {
      var geneContainingBasePair = null;
      for ( var i = 0; i < this.genes.length; i++ ) {
        var gene = this.genes[ i ];
        if ( gene.containsBasePair( basePairIndex ) ) {
          geneContainingBasePair = gene;
          break;
        }
      }

      return geneContainingBasePair;
    },

    /**
     * @private
     * True, if number is integer
     *
     * @param {number} value
     * @returns {boolean}
     */
    isInteger: function( value ) {
      if ( isNaN( value ) ) {
        return false;
      }
      var x = parseFloat( value );
      return (x | 0) === x;
    },

    /**
     * Handles overloaded createDefaultAffinityAttachmentSite by Data type
     * @param value
     * @returns {*}
     */


    /**
     * Create an attachment site instance with the default affinity for all
     * DNA-attaching biomolecules at the specified x offset.
     *
     * @param {number} xOffset
     * @return
     */
    createDefaultAffinityAttachmentSiteByDouble: function( xOffset ) {
      return new AttachmentSite( new Vector2( this.getNearestBasePairXOffset( xOffset ),
        CommonConstants.DNA_MOLECULE_Y_POS ), CommonConstants.DEFAULT_AFFINITY );
    },


    /**
     * Create an attachment site instance with the default affinity for all
     * DNA-attaching biomolecules at the specified x offset.
     *
     * @param {number} xOffset
     * @return
     */
    createDefaultAffinityAttachmentSiteByInt: function( xOffset ) {

      //    console.log("this.getBasePairXOffsetByIndex( xOffset ) "+ xOffset + "   "+ this.getBasePairXOffsetByIndex( xOffset ));

      return new AttachmentSite( new Vector2( this.getBasePairXOffsetByIndex( xOffset ),
        CommonConstants.DNA_MOLECULE_Y_POS ), CommonConstants.DEFAULT_AFFINITY );
    },


    /**
     * Get a reference to the gene that contains the given location.
     *
     * @param {Vector} location
     * @return {Gene} Gene at the location, null if no gene exists.
     */
    getGeneAtLocation: function( location ) {
      if ( !( location.x >= this.leftEdgeXOffset && location.x <= this.leftEdgeXOffset + this.moleculeLength &&
              location.y >= CommonConstants.DNA_MOLECULE_Y_POS - CommonConstants.DNA_MOLECULE_DIAMETER / 2 && location.y <= CommonConstants.DNA_MOLECULE_Y_POS + CommonConstants.DNA_MOLECULE_DIAMETER / 2 ) ) {
        console.log( " - Warning: Location for gene test is not on DNA molecule." );
        return null;
      }
      var geneAtLocation = null;
      var basePairIndex = this.getBasePairIndexFromXOffset( location.x );
      _.forEach( this.genes, function( gene ) {
        if ( gene.containsBasePair( basePairIndex ) ) {

          // Found the corresponding gene.
          geneAtLocation = gene;
          return false; //break;
        }
      } );
      return geneAtLocation;
    },

    reset: function() {
      _.forEach( this.genes, function( gene ) {
        gene.clearAttachmentSites();
      } );
      this.separations.clear();
    }

  } );

} );
