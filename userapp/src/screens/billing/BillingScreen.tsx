import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import {useTheme} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {listBillingProducts} from '../../services/billingService';
import {useBillingStore} from '../../stores/billingStore';
import {useAuthStore} from '../../stores/authStore';
import {apiService} from '../../services/apiService';

const BillingScreen = () => {
  const {colors, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const products = useMemo(() => listBillingProducts(), []);
  const plan = useAuthStore((state) => state.user?.plan ?? 'free');
  const isPremium = plan === 'premium';
  const upgrade = useBillingStore((state) => state.upgrade);
  const restore = useBillingStore((state) => state.restore);
  const isProcessing = useBillingStore((state) => state.isProcessing);
  const lastError = useBillingStore((state) => state.lastError);
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.id);
  const [promoCode, setPromoCode] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);

  useEffect(() => {
    if (lastError) {
      Alert.alert('Billing', lastError);
    }
  }, [lastError]);

  const tokens = useMemo(
    () => ({
      background: colors.background,
      card: colors.card || (dark ? '#0F172A' : '#FFFFFF'),
      border: colors.border || (dark ? 'rgba(148, 163, 184, 0.35)' : '#E2E8F0'),
      accent: colors.primary || '#2563EB',
      text: colors.text || '#1F2937',
      muted: dark ? 'rgba(226,232,240,0.7)' : '#475569',
    }),
    [colors, dark],
  );

  const handleUpgrade = async () => {
    if (!selectedProduct) {
      return;
    }
    const success = await upgrade(selectedProduct, promoCode.trim() || undefined);
    if (success) {
      Alert.alert('Premium activated', 'Your premium plan is now active.');
      setPromoCode('');
      setShowPromoInput(false);
    }
  };

  const handleRestore = async () => {
    const success = await restore();
    if (success) {
      Alert.alert('Restored', 'Premium plan restored.');
    } else {
      Alert.alert('Nothing to restore', 'We could not find an active purchase.');
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your premium subscription? You will lose access to all premium features at the end of your billing period.',
      [
        {text: 'Keep Premium', style: 'cancel'},
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.cancelSubscription();
              if (response.error) {
                Alert.alert('Error', response.error);
              } else {
                await useAuthStore.getState().setPlan('free');
                await useAuthStore.getState().refreshProfile();
                Alert.alert('Cancelled', 'Your subscription has been cancelled.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: tokens.background, paddingTop: insets.top + 16}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
          <View style={[styles.heroIcon, {backgroundColor: tokens.accent}]}>
            <MaterialIcons name="workspace-premium" size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.heroTitle, {color: tokens.text}]}>
            {isPremium ? 'Thanks for being Premium!' : 'Upgrade to Premium'}
          </Text>
          <Text style={[styles.heroSubtitle, {color: tokens.muted}]}>
            {isPremium
              ? 'You have access to all premium features. Manage your subscription below.'
              : 'Unlock 24×7 emergency response, advanced live tracking, unlimited contacts, and more.'}
          </Text>
          {isPremium && (
            <View style={[styles.planStatusBadge, {backgroundColor: `${tokens.accent}15`}]}>
              <MaterialIcons name="check-circle" size={18} color={tokens.accent} />
              <Text style={[styles.planStatusText, {color: tokens.accent}]}>
                Premium Active
              </Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.benefitRow}>
            <MaterialIcons name="support-agent" size={20} color={tokens.accent} />
            <Text style={[styles.benefitText, {color: tokens.text}]}>24×7 response center</Text>
          </View>
          <View style={styles.benefitRow}>
            <MaterialIcons name="route" size={20} color={tokens.accent} />
            <Text style={[styles.benefitText, {color: tokens.text}]}>Route guard & deviation alerts</Text>
          </View>
          <View style={styles.benefitRow}>
            <MaterialIcons name="groups" size={20} color={tokens.accent} />
            <Text style={[styles.benefitText, {color: tokens.text}]}>Trusted circles & premium community</Text>
          </View>
        </View>

        {/* Feature Comparison Table */}
        <View style={[styles.comparisonCard, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
          <Text style={[styles.comparisonTitle, {color: tokens.text}]}>Free vs Premium</Text>
          <View style={styles.comparisonHeader}>
            <View style={styles.comparisonColumn}>
              <Text style={[styles.comparisonColumnTitle, {color: tokens.muted}]}>Features</Text>
            </View>
            <View style={styles.comparisonColumn}>
              <Text style={[styles.comparisonColumnTitle, {color: tokens.muted}]}>Free</Text>
            </View>
            <View style={styles.comparisonColumn}>
              <Text style={[styles.comparisonColumnTitle, {color: tokens.accent}]}>Premium</Text>
            </View>
          </View>
          
          {[
            {feature: 'SOS Alerts', free: '✓', premium: '✓'},
            {feature: 'Emergency Contacts', free: '3', premium: 'Unlimited'},
            {feature: 'Route Guard & Alerts', free: '✗', premium: '✓'},
            {feature: 'Community Alerts', free: 'Basic', premium: 'Premium'},
            {feature: 'Geo-fencing Alerts', free: '✗', premium: '✓'},
          ].map((row, index) => (
            <View key={index} style={styles.comparisonRow}>
              <View style={styles.comparisonColumn}>
                <Text style={[styles.comparisonFeature, {color: tokens.text}]}>{row.feature}</Text>
              </View>
              <View style={styles.comparisonColumn}>
                <Text style={[styles.comparisonValue, {color: tokens.muted}]}>{row.free}</Text>
              </View>
              <View style={styles.comparisonColumn}>
                <Text style={[styles.comparisonValue, {color: tokens.accent, fontWeight: '600'}]}>{row.premium}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, {color: tokens.text}]}>Choose your plan</Text>
          <Text style={[styles.sectionSubtitle, {color: tokens.muted}]}>
            Cancel anytime. All premium features unlocked.
          </Text>
        </View>

        {products.map((product) => {
          const selected = selectedProduct === product.id;
          const isAnnual = product.id === 'premium-annual';
          const monthlyPrice = isAnnual ? '₹400 / month' : '₹499 / month';
          return (
            <TouchableOpacity
              key={product.id}
              style={[
                styles.productCard,
                {
                  backgroundColor: tokens.card,
                  borderColor: selected ? tokens.accent : tokens.border,
                  borderWidth: selected ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedProduct(product.id)}
              activeOpacity={0.8}
              disabled={isProcessing}>
              <View style={styles.productHeader}>
                <View style={{flex: 1}}>
                  <Text style={[styles.productTitle, {color: tokens.text}]}>{product.title}</Text>
                  {product.badge ? (
                    <View style={[styles.productBadge, {backgroundColor: `${tokens.accent}1F`, alignSelf: 'flex-start', marginTop: 6}]}>
                      <Text style={[styles.productBadgeText, {color: tokens.accent}]}>{product.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.selectIndicator, {borderColor: tokens.accent}]}>
                  <MaterialIcons
                    name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={selected ? tokens.accent : tokens.muted}
                  />
                </View>
              </View>
              <Text style={[styles.productSubtitle, {color: tokens.muted}]}>{product.subtitle}</Text>
              <View style={styles.priceContainer}>
                <Text style={[styles.productPrice, {color: tokens.text}]}>{product.price}</Text>
                {isAnnual && (
                  <Text style={[styles.monthlyEquivalent, {color: tokens.muted}]}>
                    {monthlyPrice} billed annually
                  </Text>
                )}
              </View>
              {product.savings && (
                <View style={[styles.savingsBadge, {backgroundColor: `${tokens.accent}15`}]}>
                  <MaterialIcons name="local-offer" size={16} color={tokens.accent} />
                  <Text style={[styles.savingsText, {color: tokens.accent}]}>{product.savings}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Promo Code Input */}
        {!isPremium && (
          <TouchableOpacity
            style={styles.promoCodeToggle}
            onPress={() => setShowPromoInput(!showPromoInput)}
            activeOpacity={0.7}>
            <MaterialIcons name="local-offer" size={18} color={tokens.accent} />
            <Text style={[styles.promoCodeToggleText, {color: tokens.accent}]}>
              {showPromoInput ? 'Hide promo code' : 'Have a promo code?'}
            </Text>
          </TouchableOpacity>
        )}

        {showPromoInput && !isPremium && (
          <View style={[styles.promoCodeContainer, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
            <TextInput
              style={[styles.promoCodeInput, {color: tokens.text, borderColor: tokens.border}]}
              placeholder="Enter promo code"
              placeholderTextColor={tokens.muted}
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
            />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            {backgroundColor: tokens.accent},
            isProcessing && {opacity: 0.6},
            isPremium && {backgroundColor: 'rgba(37,99,235,0.18)'},
          ]}
          onPress={handleUpgrade}
          disabled={isProcessing || isPremium}
          activeOpacity={0.85}>
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name={isPremium ? 'check-circle' : 'workspace-premium'} size={22} color={isPremium ? tokens.accent : '#FFFFFF'} />
              <Text
                style={[
                  styles.primaryButtonText,
                  {color: isPremium ? tokens.accent : '#FFFFFF'},
                ]}>
                {isPremium ? 'Premium Active' : 'Buy Premium'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {isPremium ? (
          <TouchableOpacity
            style={[styles.cancelButton, {borderColor: tokens.border}]}
            onPress={handleCancelSubscription}
            disabled={isProcessing}
            activeOpacity={0.85}>
            <MaterialIcons name="cancel" size={20} color="#DC2626" />
            <Text style={[styles.cancelButtonText, {color: '#DC2626'}]}>Cancel subscription</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleRestore}
            disabled={isProcessing}
            activeOpacity={0.85}>
            <MaterialIcons name="restore" size={20} color={tokens.accent} />
            <Text style={[styles.secondaryButtonText, {color: tokens.accent}]}>Restore purchases</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 18,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.22)',
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  productCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  productSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  productBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  productBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  selectIndicator: {
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    marginLeft: 12,
  },
  priceContainer: {
    gap: 4,
  },
  monthlyEquivalent: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  savingsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  planStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  planStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  promoCodeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  promoCodeToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  promoCodeContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  promoCodeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  comparisonCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  comparisonHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.22)',
    paddingBottom: 10,
    marginBottom: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.1)',
  },
  comparisonColumn: {
    flex: 1,
  },
  comparisonColumnTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonFeature: {
    fontSize: 14,
    fontWeight: '500',
  },
  comparisonValue: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default BillingScreen;


