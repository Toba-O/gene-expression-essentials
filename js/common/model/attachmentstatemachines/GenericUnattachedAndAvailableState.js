//  Copyright 2002-2014, University of Colorado Boulder
/**
 * @author John Blanco
 * @author Mohamed Safi
 */

define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var AttachmentState = require( 'GENE_EXPRESSION_BASICS/common/model/attachmentstatemachines/AttachmentState' );
  var MeanderToDestinationMotionStrategy = require( 'GENE_EXPRESSION_BASICS/common/model/attachmentstatemachines/MeanderToDestinationMotionStrategy' );
  var RandomWalkMotionStrategy = require( 'GENE_EXPRESSION_BASICS/common/model/motionstrategies/RandomWalkMotionStrategy' );

  function GenericUnattachedAndAvailableState() {
    AttachmentState.call( this );
  }

  return inherit( AttachmentState, GenericUnattachedAndAvailableState, {

    /**
     * @Override
     * @param {AttachmentStateMachine} enclosingStateMachine
     * @param {number} dt
     */
    stepInTime: function( enclosingStateMachine, dt ) {
      var gsm = enclosingStateMachine;

      // Make the biomolecule look for attachments.
      gsm.attachmentSite = gsm.biomolecule.proposeAttachments();
      if ( gsm.attachmentSite !== null ) {

        // A proposal was accepted.  Mark the attachment site as being in use.
        gsm.attachmentSite.attachedOrAttachingMolecule.set( gsm.biomolecule );

        // Start moving towards the site.
        gsm.biomolecule.setMotionStrategy( new MeanderToDestinationMotionStrategy( gsm.attachmentSite.locationProperty,
          gsm.biomolecule.motionBoundsProperty, gsm.destinationOffset ) );

        // Update state.
        gsm.setState( gsm.movingTowardsAttachmentState );
      }
    },

    /**
     * @param {AttachmentStateMachine} enclosingStateMachine
     */
    entered: function( enclosingStateMachine ) {
      enclosingStateMachine.biomolecule.setMotionStrategy(
        new RandomWalkMotionStrategy( enclosingStateMachine.biomolecule.motionBoundsProperty ) );

      // Allow user interaction.
      enclosingStateMachine.biomolecule.movableByUser.set( true );
    }
  } );


} );