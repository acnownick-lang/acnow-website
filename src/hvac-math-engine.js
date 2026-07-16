/**
 * HVAC Math Engine module for Airflow Simulation
 * Handles temperature decay, damper multipliers, comfort scoring, physical static pressure,
 * dynamic sales ROI savings, and recommendations.
 */
window.HVACMathEngine = {
    calculateVelocityMultiplier(dampers) {
        const activeCount = (dampers.a ? 1 : 0) + (dampers.b ? 1 : 0) + (dampers.c ? 1 : 0);
        if (activeCount === 2) return 1.5;
        if (activeCount === 1) return 2.5;
        if (activeCount === 0) return 0.0;
        return 1.0;
    },
    
    validateDeltaT(returnT, supplyT) {
        if (isNaN(returnT) || isNaN(supplyT)) {
            return { returnT: 75.0, supplyT: 57.0, splitVal: 0, error: "Incomplete Inputs" };
        }
        
        // Programmatic range enforcement
        if (returnT < 60 || returnT > 100) {
            return { returnT, supplyT, splitVal: 0, error: "Range Err (60-100)" };
        }
        if (supplyT < 40 || supplyT > 80) {
            return { returnT, supplyT, splitVal: 0, error: "Range Err (40-80)" };
        }
        if (returnT <= supplyT) {
            return { returnT, supplyT, splitVal: 0, error: "Ret must be > Sup" };
        }
        
        const splitVal = parseFloat((returnT - supplyT).toFixed(1));
        return { returnT, supplyT, splitVal, error: null };
    },

    calculateStaticPressure(dampers) {
        const closedDampers = (!dampers.a ? 1 : 0) + (!dampers.b ? 1 : 0) + (!dampers.c ? 1 : 0);
        if (closedDampers === 3) return 2.5; // system choked, high backpressure spike
        
        const frictionRate = 0.1; // in.wg per 100ft, industry-standard residential default
        const baseEquivLength = 150; // approximate total equivalent duct run, ft
        const filterCoilBaseline = 0.5; // in.wg, typical combined filter+coil resistance
        const backpressurePerClosed = 0.07; // in.wg added per closed branch

        const frictionLoss = (baseEquivLength / 100) * frictionRate;
        const backpressure = closedDampers * backpressurePerClosed;
        return Math.min(frictionLoss + filterCoilBaseline + backpressure, 1.4); // clamp to realistic range
    },

    calculateSavingsPercent(roomDimensions, dampers, deltaT) {
        let savings = 0.08; // baseline: duct sealing / register cleanup floor
        const closedDampers = (!dampers.a ? 1 : 0) + (!dampers.b ? 1 : 0) + (!dampers.c ? 1 : 0);
        savings += closedDampers * 0.035; // each closed/restricted register adds real inefficiency
        if (deltaT && (!deltaT.error && (deltaT.splitVal < 16 || deltaT.splitVal > 22))) {
            savings += 0.10; // failing delta T split indicates real system inefficiency
        }
        return Math.min(savings, 0.35); // cap at defensible ceiling (35%)
    },
    
    updateThermodynamics(dt, dampers, roomTemps, registers, hotspot1, hotspot2, roomDimensions, currentCFM, deltaT) {
        const totalArea = roomDimensions.reduce((sum, room) => sum + (room.width * room.length), 0);
        
        for (let i = 0; i < 3; i++) {
            const room = roomDimensions[i];
            const nominalTotalCFM = 1200;
            const requiredCFM = (room.width * room.length / totalArea) * nominalTotalCFM;
            
            const isOpen = (i === 0 && dampers.a) || (i === 1 && dampers.b) || (i === 2 && dampers.c);
            let deliveredCFM = isOpen ? (currentCFM / nominalTotalCFM) * requiredCFM * 0.95 : requiredCFM * 0.05;
            
            // If delta T is failing, degrade the cooling effectiveness by 25%
            if (deltaT && (deltaT.error || deltaT.splitVal < 16 || deltaT.splitVal > 22)) {
                deliveredCFM *= 0.75;
            }
            
            // Florida summer solar load / appliance heat gain
            let ambientTemp = 80.0;
            if (i === 0 && hotspot1) {
                ambientTemp += hotspot1.scale.x * 6.0; // scales from 0.4 to 1.5+ based on distance
            } else if (i === 1 && hotspot2) {
                ambientTemp += hotspot2.scale.x * 6.0;
            } else if (i === 2) {
                ambientTemp += 2.0; // kitchen baseline heat gain
            }
            
            const ratio = Math.min(1.0, deliveredCFM / requiredCFM);
            const targetTemp = 72.0 + (1 - ratio) * (ambientTemp - 72.0);
            
            // Dynamic thermal inertia interpolation
            roomTemps[i] = roomTemps[i] + (targetTemp - roomTemps[i]) * dt * 0.2;
            
            // Clamp to residential bounds
            roomTemps[i] = Math.max(65.0, Math.min(95.0, roomTemps[i]));
            
            // Sync hotspot visual feedback
            if (i === 0 && hotspot1) {
                if (isOpen && ratio > 0.5) {
                    hotspot1.scale.setScalar(Math.max(0.4, hotspot1.scale.x - dt * 0.4));
                    hotspot1.material.color.setHex(0x00f2fe); // Cyan
                } else {
                    hotspot1.scale.setScalar(Math.min(1.6, hotspot1.scale.x + dt * 0.2));
                    hotspot1.material.color.setHex(0xff3366); // Red/hot
                }
            }
            if (i === 1 && hotspot2) {
                if (isOpen && ratio > 0.5) {
                    hotspot2.scale.setScalar(Math.max(0.4, hotspot2.scale.x - dt * 0.4));
                    hotspot2.material.color.setHex(0x00f2fe);
                } else {
                    hotspot2.scale.setScalar(Math.min(1.6, hotspot2.scale.x + dt * 0.2));
                    hotspot2.material.color.setHex(0xff3366);
                }
            }
        }
    },
    
    calculateComfortScore(roomTemps, deltaT) {
        const targetTemp = 72.0;
        const devA = Math.abs(roomTemps[0] - targetTemp);
        const devB = Math.abs(roomTemps[1] - targetTemp);
        const devC = Math.abs(roomTemps[2] - targetTemp);
        let score = Math.max(0, Math.min(100, Math.round(100 - (devA + devB + devC) * 5)));
        
        if (deltaT && (deltaT.error || deltaT.splitVal < 16 || deltaT.splitVal > 22)) {
            score = Math.round(score * 0.85); // drag down score if system airflow split fails
        }
        return score;
    },
    
    getRecommendation(comfortScore) {
        if (comfortScore < 60) {
            return {
                text: `<strong>Significant imbalance detected:</strong> Large temperature splits exist between zones. A professional duct balancing audit is recommended to restore system equilibrium.`,
                color: '#ff6b6b',
                borderColor: 'rgba(239, 68, 68, 0.3)'
            };
        } else if (comfortScore < 90) {
            return {
                text: `<strong>Moderate imbalance:</strong> Adjust supply registers closer to window hotspots to even out the thermal load.`,
                color: '#ff9f0a',
                borderColor: 'rgba(255, 159, 10, 0.3)'
            };
        } else {
            return {
                text: `<strong>Zones are well balanced.</strong> Regular seasonal tune-ups will help maintain optimal distribution.`,
                color: '#10b981',
                borderColor: 'rgba(16, 185, 129, 0.3)'
            };
        }
    }
};
