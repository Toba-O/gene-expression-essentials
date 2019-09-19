// Copyright 2015-2017, University of Colorado Boulder

/**
 * Node that represents a cell (as in a biological organism) that changes color as the level of protein within the cell
 * changes. The color change is meant to represent a cell that is expressing a fluorescent protein, something like
 * Green Fluorescent Protein, or GFP.
 *
 * @author John Blanco
 * @author Mohamed Safi
 * @author Aadish Gupta
 */
define( require => {
  'use strict';

  // modules
  const Cell = require( 'GENE_EXPRESSION_ESSENTIALS/multiple-cells/model/Cell' );
  const Color = require( 'SCENERY/util/Color' );
  const geneExpressionEssentials = require( 'GENE_EXPRESSION_ESSENTIALS/geneExpressionEssentials' );
  const inherit = require( 'PHET_CORE/inherit' );
  const Node = require( 'SCENERY/nodes/Node' );
  const Path = require( 'SCENERY/nodes/Path' );
  const Util = require( 'DOT/Util' );

  // constants
  const NOMINAL_FILL_COLOR = new Color( 30, 30, 40 ); // Blue Gray
  const FLORESCENT_FILL_COLOR = new Color( 200, 255, 58 );
  const STROKE = 2;
  const STROKE_COLOR = Color.WHITE;

  /**
   * @param {Cell} cell
   * @param {ModelViewTransform2} modelViewTransform
   * @constructor
   */
  function ColorChangingCellNode( cell, modelViewTransform ) {
    Node.call( this );

    const cellBody = new Path( modelViewTransform.modelToViewShape( cell.getShape() ), {
      fill: NOMINAL_FILL_COLOR,
      stroke: STROKE_COLOR,
      lineWidth: STROKE,
      boundsMethod: 'unstroked',
      center: modelViewTransform.modelToViewXY( cell.positionX, cell.positionY )
    } );

    cell.proteinCount.lazyLink( function( proteinCount ) {
      const florescenceAmount = Util.clamp( ( proteinCount - Cell.ProteinLevelWhereColorChangeStarts ) /
                                          ( Cell.ProteinLevelWhereColorChangeCompletes - Cell.ProteinLevelWhereColorChangeStarts ), 0, 1.0 );
      cellBody.fill = Color.interpolateRGBA( NOMINAL_FILL_COLOR, FLORESCENT_FILL_COLOR, florescenceAmount );
    } );
    this.addChild( cellBody );
  }

  geneExpressionEssentials.register( 'ColorChangingCellNode', ColorChangingCellNode );

  return inherit( Node, ColorChangingCellNode, {}, {

    // statics
    NominalFillColor: NOMINAL_FILL_COLOR,
    FlorescentFillColor: FLORESCENT_FILL_COLOR
  } );
} );