// Copyright 2015-2020, University of Colorado Boulder

/**
 * A motion strategy where the user moves in a general direction with some random direction changes every once in a while.
 *
 * @author John Blanco
 * @author Mohamed Safi
 * @author Aadish Gupta
 */

import Vector2 from '../../../../../dot/js/Vector2.js';
import Vector3 from '../../../../../dot/js/Vector3.js';
import inherit from '../../../../../phet-core/js/inherit.js';
import geneExpressionEssentials from '../../../geneExpressionEssentials.js';
import MotionStrategy from './MotionStrategy.js';

// constants
const MIN_VELOCITY = 100; // In picometers/s
const MAX_VELOCITY = 500; // In picometers/s
const MIN_TIME_IN_ONE_DIRECTION = 0.25; // In seconds.
const MAX_TIME_IN_ONE_DIRECTION = 1.25; // In seconds.

/**
 * @param  {Vector2} generalDirection
 * @param motionBoundsProperty
 * @constructor
 */
function WanderInGeneralDirectionMotionStrategy( generalDirection, motionBoundsProperty ) {
  const self = this;
  MotionStrategy.call( self );
  this.directionChangeCountdown = 0; // @private
  this.currentMotionVector = new Vector2( 0, 0 ); // @private

  function handleMotionBoundsChanged( motionBounds ) {
    self.motionBounds = motionBounds;
  }

  motionBoundsProperty.link( handleMotionBoundsChanged );

  this.disposeWanderInGeneralDirectionMotionStrategy = function() {
    motionBoundsProperty.unlink( handleMotionBoundsChanged );
  };

  this.generalDirection = generalDirection;
}

geneExpressionEssentials.register( 'WanderInGeneralDirectionMotionStrategy', WanderInGeneralDirectionMotionStrategy );

inherit( MotionStrategy, WanderInGeneralDirectionMotionStrategy, {

  /**
   * @override
   * @public
   */
  dispose: function() {
    this.disposeWanderInGeneralDirectionMotionStrategy();
  },

  /**
   * @returns {number}
   * @private
   */
  generateDirectionChangeCountdownValue: function() {
    return MIN_TIME_IN_ONE_DIRECTION + phet.joist.random.nextDouble() *
           ( MAX_TIME_IN_ONE_DIRECTION - MIN_TIME_IN_ONE_DIRECTION );
  },

  /**
   * @override
   * @param {Vector2} currentPosition
   * @param {Bounds2} bounds
   * @param {number} dt
   * @returns {Vector2}
   * @public
   */
  getNextPosition: function( currentPosition, bounds, dt ) {
    this.directionChangeCountdown -= dt;
    if ( this.directionChangeCountdown <= 0 ) {

      // Time to change the direction.
      const newVelocity = MIN_VELOCITY + phet.joist.random.nextDouble() * ( MAX_VELOCITY - MIN_VELOCITY );
      const varianceAngle = ( phet.joist.random.nextDouble() - 0.5 ) * Math.PI / 3;
      this.currentMotionVector = this.generalDirection.withMagnitude( newVelocity ).rotated( varianceAngle );

      // Reset the countdown timer.
      this.directionChangeCountdown = this.generateDirectionChangeCountdownValue();
    }

    // Make sure that current motion will not cause the model element to move outside of the motion bounds.
    if ( !this.motionBounds.testIfInMotionBoundsWithDelta( bounds, this.currentMotionVector, dt ) ) {

      // The current motion vector would take this element out of bounds, so it needs to "bounce".
      this.currentMotionVector = this.getMotionVectorForBounce( bounds, this.currentMotionVector, dt, MAX_VELOCITY );

      // Reset the timer.
      this.directionChangeCountdown = this.generateDirectionChangeCountdownValue();
    }

    return currentPosition.plus( this.currentMotionVector.timesScalar( dt ) );
  },

  /**
   * @override
   * @param {Vector3} currentPosition
   * @param {Bounds2} bounds
   * @param {number} dt
   * @returns {Vector3}
   * @public
   */
  getNextPosition3D: function( currentPosition, bounds, dt ) {

    // The 3D version of this motion strategy doesn't move in the z direction. This may change some day.
    const nextPosition2D = this.getNextPosition( new Vector2( currentPosition.x, currentPosition.y ), bounds, dt );
    return new Vector3( nextPosition2D.x, nextPosition2D.y, currentPosition.z );
  }
} );

export default WanderInGeneralDirectionMotionStrategy;