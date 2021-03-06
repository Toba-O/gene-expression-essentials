// Copyright 2015-2020, University of Colorado Boulder

/**
 * main screen view type for the 'Expression' screen
 *
 * @author Sharfudeen Ashraf
 * @author John Blanco
 * @author Aadish Gupta
 */

import Property from '../../../axon/js/Property.js';
import Screen from '../../../joist/js/Screen.js';
import ScreenIcon from '../../../joist/js/ScreenIcon.js';
import Image from '../../../scenery/js/nodes/Image.js';
import manualGeneExpressionIcon from '../../mipmaps/manual-gene-expression-icon_png.js';
import GEEConstants from '../common/GEEConstants.js';
import geneExpressionEssentials from '../geneExpressionEssentials.js';
import geneExpressionEssentialsStrings from '../geneExpressionEssentialsStrings.js';
import ManualGeneExpressionModel from './model/ManualGeneExpressionModel.js';
import ManualGeneExpressionScreenView from './view/ManualGeneExpressionScreenView.js';

class ManualGeneExpressionScreen extends Screen {
  constructor() {

    const options = {
      name: geneExpressionEssentialsStrings.screen.expression,
      backgroundColorProperty: new Property( '#ABCBDB' ),
      homeScreenIcon: new ScreenIcon( new Image( manualGeneExpressionIcon ), {
        maxIconWidthProportion: 1,
        maxIconHeightProportion: 1
      } ),
      maxDT: GEEConstants.MAX_DT
    };

    super(
      function() { return new ManualGeneExpressionModel();},
      function( model ) { return new ManualGeneExpressionScreenView( model ); },
      options
    );
  }
}

geneExpressionEssentials.register( 'ManualGeneExpressionScreen', ManualGeneExpressionScreen );
export default ManualGeneExpressionScreen;