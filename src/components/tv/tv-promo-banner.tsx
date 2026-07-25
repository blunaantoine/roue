'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PromotionMessage } from '@/types';
import { useAppStore } from '@/stores/app-store';
import { promotionsApi } from '@/lib/api';
import { Megaphone, Star, ShoppingBag } from 'lucide-react';

interface TVPromoBannerProps {
  campaignId?: string;
  rotationInterval?: number; // in milliseconds
}

const DEFAULT_PROMOTIONS: PromotionMessage[] = [
  {
    id: 'default-1',
    title: 'Welcome!',
    content: 'Visit our store and spin the wheel for amazing prizes!',
    active: true,
    campaignId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-2',
    title: 'Special Offers',
    content: 'Don\'t miss our exclusive promotions — spin now and win big!',
    active: true,
    campaignId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function TVPromoBanner({ campaignId, rotationInterval = 10000 }: TVPromoBannerProps) {
  const { currentPromotion } = useAppStore();
  const [promotions, setPromotions] = useState<PromotionMessage[]>(DEFAULT_PROMOTIONS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load promotions from API
  useEffect(() => {
    async function loadPromotions() {
      if (!campaignId) return;
      try {
        setLoading(true);
        const data = await promotionsApi.list(campaignId);
        const activePromotions = (Array.isArray(data) ? data : []).filter((p: PromotionMessage) => p.active);
        if (activePromotions.length > 0) {
          setPromotions(activePromotions);
        }
      } catch (error) {
        console.error('Failed to load promotions:', error);
        // Keep default promotions on error
      } finally {
        setLoading(false);
      }
    }
    loadPromotions();
  }, [campaignId]);

  // Auto-rotate promotions
  useEffect(() => {
    if (promotions.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promotions.length);
    }, rotationInterval);

    return () => clearInterval(timer);
  }, [promotions.length, rotationInterval]);

  // Handle socket promotion updates
  useEffect(() => {
    if (currentPromotion && currentPromotion.active) {
      // Add or update the promotion in our list
      setPromotions((prev) => {
        const exists = prev.find(p => p.id === currentPromotion.id);
        if (exists) {
          return prev.map(p => p.id === currentPromotion.id ? currentPromotion : p);
        }
        return [...prev, currentPromotion];
      });
      // Jump to the new promotion immediately
      const newIndex = promotions.findIndex(p => p.id === currentPromotion.id);
      if (newIndex >= 0) {
        setCurrentIndex(newIndex);
      } else {
        setCurrentIndex(promotions.length); // will be the newly added one
      }
    }
  }, [currentPromotion, promotions]);

  const currentPromo = promotions[currentIndex] || DEFAULT_PROMOTIONS[0];

  // Get icon for the promotion
  const getPromoIcon = useCallback(() => {
    const title = currentPromo.title.toLowerCase();
    if (title.includes('sale') || title.includes('offer') || title.includes('discount')) {
      return <ShoppingBag className="w-8 h-8" />;
    }
    if (title.includes('star') || title.includes('special') || title.includes('exclusive')) {
      return <Star className="w-8 h-8" />;
    }
    return <Megaphone className="w-8 h-8" />;
  }, [currentPromo.title]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-purple-900/40" />
      
      {/* Animated decorative elements */}
      <motion.div
        className="absolute inset-0 opacity-10"
        animate={{
          background: [
            'radial-gradient(circle at 20% 50%, rgba(168, 85, 247, 0.3), transparent 50%)',
            'radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.3), transparent 50%)',
            'radial-gradient(circle at 20% 50%, rgba(168, 85, 247, 0.3), transparent 50%)',
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPromo.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="relative flex items-center justify-center gap-6 h-full px-8"
        >
          {/* Icon */}
          <div className="text-amber-400 shrink-0">
            {getPromoIcon()}
          </div>

          {/* Title and content */}
          <div className="flex-1 min-w-0 text-center">
            <h3 className="text-xl font-bold text-amber-300 tracking-wide mb-1">
              {currentPromo.title}
            </h3>
            <p className="text-lg text-white/80 leading-relaxed">
              {currentPromo.content}
            </p>
          </div>

          {/* Icon (mirror) */}
          <div className="text-amber-400 shrink-0">
            {getPromoIcon()}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress indicators */}
      {promotions.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
          {promotions.map((_, index) => (
            <motion.div
              key={`indicator-${index}`}
              className={`w-2 h-2 rounded-full ${
                index === currentIndex
                  ? 'bg-amber-400'
                  : 'bg-white/30'
              }`}
              animate={{
                scale: index === currentIndex ? 1.3 : 1,
                opacity: index === currentIndex ? 1 : 0.4,
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      )}

      {/* Rotation timer bar */}
      {promotions.length > 1 && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-400"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: rotationInterval / 1000, ease: 'linear' }}
          key={`timer-${currentIndex}`}
        />
      )}
    </div>
  );
}
