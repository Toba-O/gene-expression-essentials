// Copyright 2015, University of Colorado Boulder

/**
 * This class defines the box on the user interface from which the user can
 * extract various biomolecules and put them into action within the cell.
 *
 * @author Sharfudeen Ashraf
 * @author John Blanco
 */
define( function( require ) {
  'use strict';

  // modules
  var geneExpressionEssentials = require( 'GENE_EXPRESSION_ESSENTIALS/geneExpressionEssentials' );
  var inherit = require( 'PHET_CORE/inherit' );
  var PhetFont = require( 'SCENERY_PHET/PhetFont' );
  var Text = require( 'SCENERY/nodes/Text' );
  var MultiLineText = require( 'SCENERY_PHET/MultiLineText' );
  var Panel = require( 'SUN/Panel' );
  var HBox = require( 'SCENERY/nodes/HBox' );
  var VBox = require( 'SCENERY/nodes/VBox' );
  var Color = require( 'SCENERY/util/Color' );
  var TranscriptionFactorCreatorNode = require( 'GENE_EXPRESSION_ESSENTIALS/manualgeneexpression/view/TranscriptionFactorCreatorNode' );
  var RnaPolymeraseCreatorNode = require( 'GENE_EXPRESSION_ESSENTIALS/manualgeneexpression/view/RnaPolymeraseCreatorNode' );
  var RibosomeCreatorNode = require( 'GENE_EXPRESSION_ESSENTIALS/manualgeneexpression/view/RibosomeCreatorNode' );
  var MessengerRnaDestroyerCreatorNode = require( 'GENE_EXPRESSION_ESSENTIALS/manualgeneexpression/view/MessengerRnaDestroyerCreatorNode' );

  // constants
  var TITLE_FONT = new PhetFont( { size: 20, weight: 'bold' } );

  // strings
  var biomoleculeToolboxString = require( 'string!GENE_EXPRESSION_ESSENTIALS/biomoleculeToolbox' );
  var positiveTranscriptionFactorHtmlString = require( 'string!GENE_EXPRESSION_ESSENTIALS/positiveTranscriptionFactorHtml' );
  var ribosomeString = require( 'string!GENE_EXPRESSION_ESSENTIALS/ribosome' );
  var rnaPolymeraseString = require( 'string!GENE_EXPRESSION_ESSENTIALS/rnaPolymerase' );
  var mrnaDestroyerString = require( 'string!GENE_EXPRESSION_ESSENTIALS/mrnaDestroyer' );
  var negativeTranscriptionFactorHtmlString = require( 'string!GENE_EXPRESSION_ESSENTIALS/negativeTranscriptionFactorHtml' );

  /**
   * Convenience class for creating row labels.
   */
  function RowLabel( text ) {
    var thisNode = this;
    MultiLineText.call( thisNode, text, { font: new PhetFont( { size: 15 } ) } );
  }

  inherit( MultiLineText, RowLabel );

  /**
   *
   * @param {ManualGeneExpressionModel} model
   * @param {ManualGeneExpressionScreenView} canvas
   * @param {ModelViewTransform2} mvt
   * @param {Gene} gene
   * @constructor
   */
  function BiomoleculeToolBoxNode( model, canvas, mvt, gene ) {
    var thisNode = this;

    thisNode.model = model;
    thisNode.canvas = canvas;
    thisNode.mvt = mvt;
    thisNode.biomoleculeCreatorNodeList = [];

    // Add the title.
    var toolBoxTitleNode = new Text( biomoleculeToolboxString, TITLE_FONT );

    //  Positive transcription factor(s).
    var transcriptionFactors = gene.getTranscriptionFactorConfigs();
    var tfConfig = null;
    var positiveTranscriptNodes = [];
    for ( var i = 0; i < transcriptionFactors.length; i++ ) {
      tfConfig = transcriptionFactors[ i ];
      if ( tfConfig.isPositive ) {
        positiveTranscriptNodes.push( new RowLabel( positiveTranscriptionFactorHtmlString ) );
        positiveTranscriptNodes.push( thisNode.addCreatorNode( new TranscriptionFactorCreatorNode( thisNode, tfConfig ) ) );
      }
    }

    // Add the biomolecule rows, each of which has a title and a set of  biomolecules that can be added to the active area.
    var positiveTranscriptionBox = new HBox( {
      children: positiveTranscriptNodes,
      spacing: 10
    } );

    // Polymerase.
    var polymeraseBox = new HBox( {
      children: [ new RowLabel( rnaPolymeraseString ),
        thisNode.addCreatorNode( new RnaPolymeraseCreatorNode( thisNode ) ),
        thisNode.addCreatorNode( new RnaPolymeraseCreatorNode( thisNode ) )
      ],
      spacing: 10
    } );

    // Ribosomes.
    var ribosomeBox = new HBox( {
      children: [ new RowLabel( ribosomeString ), thisNode.addCreatorNode( new RibosomeCreatorNode( thisNode ) ),
        thisNode.addCreatorNode( new RibosomeCreatorNode( thisNode ) ) ],
      spacing: 10
    } );

    // mRNA destroyer.
    var mRnaDestroyerBox = new HBox( {
      children: [ new RowLabel( mrnaDestroyerString ), thisNode.addCreatorNode( new MessengerRnaDestroyerCreatorNode( thisNode ) ),
        thisNode.addCreatorNode( new MessengerRnaDestroyerCreatorNode( thisNode ) ) ],
      spacing: 10
    } );


    // Negative transcription factor(s).
    transcriptionFactors = gene.getTranscriptionFactorConfigs();


    var negativeTranscriptorNodes = [];
    negativeTranscriptorNodes.push( new RowLabel( negativeTranscriptionFactorHtmlString ) );
    for ( i = 0; i < transcriptionFactors.length; i++ ) {
      tfConfig = transcriptionFactors[ i ];
      if ( !tfConfig.isPositive ) {
        negativeTranscriptorNodes.push( thisNode.addCreatorNode( new TranscriptionFactorCreatorNode( thisNode, tfConfig ) ) );
      }
    }

    var negativeTranscriptionBox = new HBox( {
      children: negativeTranscriptorNodes,
      spacing: 10
    } );


    // Create the content of this control panel.
    var contentNode = new VBox( {
      children: [ toolBoxTitleNode, positiveTranscriptionBox, polymeraseBox, ribosomeBox, mRnaDestroyerBox, negativeTranscriptionBox ],
      spacing: 10
    } );


    Panel.call( thisNode, contentNode, {
      fill: new Color( 250, 250, 250 ),
      lineWidth: 1,
      align: 'left'
    } );
  }

  geneExpressionEssentials.register( 'BiomoleculeToolBoxNode', BiomoleculeToolBoxNode );

  return inherit( Panel, BiomoleculeToolBoxNode, {

    reset: function() {
      var bioMoleculeCreatorNodeLength = this.biomoleculeCreatorNodeList.length;
      for ( var i = 0; i < bioMoleculeCreatorNodeLength; i++ ) {
        this.biomoleculeCreatorNodeList[ i ].reset();
      }
    },

    /**
     * Convenience function for making it easy to create a biomolecule creator
     * node and add it to the content panel at the same time.
     * @param {BiomoleculeCreatorNode} biomoleculeCreatorNode
     * @returns BiomoleculeCreatorNode
     */
    addCreatorNode: function( biomoleculeCreatorNode ) {
      this.biomoleculeCreatorNodeList.push( biomoleculeCreatorNode );
      return biomoleculeCreatorNode;
    }

  } );

} );

