import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { fetchHomePromos } from "../lib/services/homePromosService";
import {
  getCachedHomePromos,
  saveHomePromosToCache,
  clearHomePromosCache,
} from "../lib/cache/homePromosCache";
import type { HomePromoCtaAction, HomePromoSlide } from "../lib/homePromoFixtures";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

export type { HomePromoCtaAction, HomePromoSlide };

const GOLD = "#F5A623";
const AUTO_ADVANCE_MS = 5500;

type HomePromoCarouselProps = {
  slides?: HomePromoSlide[];
  /** Bump to reload admin promos (pull-to-refresh). */
  refreshKey?: number;
};

/** Soft left→right wash so copy sits in the image, art stays visible on the right. */
function SlideFade() {
  return (
    <View style={styles.fadeWrap} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="promoFadeX" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#0B1220" stopOpacity="0.78" />
            <Stop offset="42%" stopColor="#0B1220" stopOpacity="0.42" />
            <Stop offset="68%" stopColor="#0B1220" stopOpacity="0.12" />
            <Stop offset="100%" stopColor="#0B1220" stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="promoFadeY" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#0B1220" stopOpacity="0.08" />
            <Stop offset="55%" stopColor="#0B1220" stopOpacity="0" />
            <Stop offset="100%" stopColor="#0B1220" stopOpacity="0.35" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#promoFadeX)" />
        <Rect width="100%" height="100%" fill="url(#promoFadeY)" />
      </Svg>
    </View>
  );
}

function ProgressDots({
  count,
  index,
  playing,
}: {
  count: number;
  index: number;
  playing: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    if (!playing || count <= 1) return;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: AUTO_ADVANCE_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [count, index, playing, progress]);

  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, i) => {
        const active = i === index;
        const fillWidth = progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["0%", "100%"],
        });
        return (
          <View
            key={i}
            style={[styles.dotTrack, active && styles.dotTrackActive]}
          >
            {active ? (
              <Animated.View style={[styles.dotFill, { width: fillWidth }]} />
            ) : i < index ? (
              <View style={[styles.dotFill, { width: "100%" }]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function HomePromoCarousel({
  slides: slidesProp,
  refreshKey = 0,
}: HomePromoCarouselProps) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [slides, setSlides] = useState<HomePromoSlide[]>(slidesProp ?? []);
  const [ready, setReady] = useState(!!slidesProp);
  const [cardWidth, setCardWidth] = useState(
    Dimensions.get("window").width - scaleWidth(16),
  );

  const load = useCallback(async () => {
    if (slidesProp) {
      setSlides(slidesProp);
      setReady(true);
      return;
    }

    const cached = await getCachedHomePromos();
    if (cached?.length) {
      setSlides(cached);
      setReady(true);
    }

    const { slides: next, ok } = await fetchHomePromos();
    if (ok && next.length === 0) {
      setSlides([]);
      void clearHomePromosCache();
    } else if (next.length > 0) {
      const urls = next.map((slide) => slide.imageUrl);
      const cachedUrls = new Set((cached ?? []).map((slide) => slide.imageUrl));
      const missing = urls.filter((url) => !cachedUrls.has(url));
      if (missing.length > 0) {
        await Promise.race([
          Image.prefetch(missing),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);
      }
      setSlides(next);
      void saveHomePromosToCache(next);
    }
    setReady(true);
  }, [slidesProp]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    indexRef.current = 0;
    setIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [slides[0]?.id]);

  useEffect(() => {
    for (const slide of slides) {
      if (slide.imageUrl) {
        void Image.prefetch(slide.imageUrl);
      }
    }
  }, [slides]);

  const count = slides.length;

  const goTo = useCallback(
    (next: number, animated = true) => {
      if (count === 0) return;
      const clamped = ((next % count) + count) % count;
      indexRef.current = clamped;
      setIndex(clamped);
      scrollRef.current?.scrollTo({
        x: clamped * cardWidth,
        animated,
      });
    },
    [cardWidth, count],
  );

  useEffect(() => {
    if (count <= 1 || dragging) return;
    const timer = setInterval(() => {
      goTo(indexRef.current + 1);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [count, dragging, goTo]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / Math.max(cardWidth, 1));
    indexRef.current = next;
    setIndex(next);
  };

  const handleCta = (action: HomePromoCtaAction) => {
    switch (action) {
      case "register_safaricom":
        router.push("/register-safaricom-customer" as any);
        break;
      case "register_airtel":
        router.push("/register-customer" as any);
        break;
      case "leads":
        router.navigate("/leads" as any);
        break;
    }
  };

  if (!ready) {
    return (
      <View style={styles.wrap}>
        <View style={[styles.frame, styles.skeleton]} />
      </View>
    );
  }

  if (count === 0) return null;

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - cardWidth) > 1) setCardWidth(w);
      }}
    >
      <View style={styles.frame}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onScrollBeginDrag={() => setDragging(true)}
          onScrollEndDrag={() => setDragging(false)}
          onMomentumScrollEnd={(e) => {
            setDragging(false);
            onScrollEnd(e);
          }}
        >
          {slides.map((slide) => (
            <View key={slide.id} style={[styles.card, { width: cardWidth }]}>
              <Image
                source={{ uri: slide.imageUrl }}
                style={styles.image}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority="high"
                recyclingKey={slide.id}
                transition={0}
              />
              <SlideFade />

              <View style={styles.content}>
                <View style={styles.copy}>
                  {slide.title ? (
                    <Text style={styles.title} numberOfLines={2}>
                      {slide.title}
                    </Text>
                  ) : null}
                  {slide.subtitle ? (
                    <Text style={styles.subtitle} numberOfLines={3}>
                      {slide.subtitle}
                    </Text>
                  ) : null}
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.cta,
                    pressed && styles.ctaPressed,
                  ]}
                  onPress={() => handleCta(slide.ctaAction)}
                  accessibilityRole="button"
                  accessibilityLabel={slide.ctaLabel}
                >
                  <Text style={styles.ctaText}>{slide.ctaLabel}</Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={scaleWidth(16)}
                    color="#1A1205"
                  />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        {count > 1 ? (
          <View style={styles.dotsOverlay} pointerEvents="none">
            <ProgressDots
              count={count}
              index={index}
              playing={!dragging}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const CARD_HEIGHT = scaleHeight(228);

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: scaleWidth(8),
    marginBottom: scaleHeight(18),
  },
  frame: {
    borderRadius: scaleWidth(20),
    overflow: "hidden",
    backgroundColor: "#0F172A",
  },
  card: {
    height: CARD_HEIGHT,
    overflow: "hidden",
    backgroundColor: "#0F172A",
  },
  skeleton: {
    height: CARD_HEIGHT,
    backgroundColor: "#0F172A",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  fadeWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(18),
    paddingBottom: scaleHeight(28),
    gap: scaleHeight(14),
  },
  copy: {
    maxWidth: "58%",
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(20),
    color: "#FFFFFF",
    lineHeight: scaleFont(25),
    letterSpacing: -0.2,
  },
  subtitle: {
    marginTop: scaleHeight(6),
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: "rgba(255,255,255,0.88)",
    lineHeight: scaleFont(17),
  },
  cta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(6),
    backgroundColor: GOLD,
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(10),
    borderRadius: scaleWidth(12),
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(13),
    color: "#1A1205",
  },
  dotsOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: scaleHeight(10),
    alignItems: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(5),
  },
  dotTrack: {
    width: scaleWidth(14),
    height: scaleHeight(3),
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.28)",
    overflow: "hidden",
  },
  dotTrackActive: {
    width: scaleWidth(28),
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  dotFill: {
    height: "100%",
    backgroundColor: GOLD,
    borderRadius: 2,
  },
});
