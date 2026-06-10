import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAudit } from '../../src/store/AuditContext';
import { Badge } from '../../src/components/Badge';
import { Colors, FontSize, Radius, Spacing } from '../../src/constants/theme';

export default function ISAScreen() {
  const { loading, state } = useAudit();
  const router = useRouter();

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.blue} />;

  const engagements = Object.values(state.engagements);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        ISA documentation and findings grouped by client engagement.
      </Text>

      {engagements.map(eng => {
        const findings = eng.findingIds.map(id => state.findings[id]).filter(Boolean);
        if (findings.length === 0) return null;

        return (
          <View key={eng.id} style={styles.section}>
            <Text style={styles.clientLabel}>{eng.clientName} — {eng.fiscalYear}</Text>

            {findings.map(f => (
              <TouchableOpacity
                key={f.id}
                style={styles.card}
                onPress={() => router.push(`/engagement/finding/${f.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.isaRef}>{f.isaReference}</Text>
                  <Badge label={f.severity} size="sm" />
                </View>
                <Text style={styles.findingTitle}>{f.title}</Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="domain" size={13} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{f.domain}</Text>
                  <Text style={styles.dot}>·</Text>
                  <MaterialCommunityIcons name="account-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{f.owner}</Text>
                </View>
                <View style={styles.statusRow}>
                  <Badge label={f.status} size="sm" />
                  {f.targetRemediationDate && (
                    <Text style={styles.dueDate}>Due {f.targetRemediationDate}</Text>
                  )}
                </View>
                {f.managementResponse ? (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseLabel}>Management response</Text>
                    <Text style={styles.responseText} numberOfLines={2}>{f.managementResponse}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgTertiary },
  content: { padding: Spacing.lg, paddingBottom: 40 },
  intro: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },
  section: { marginBottom: Spacing.xl },
  clientLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.lg,
    borderWidth: 0.5, borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  isaRef: { fontSize: FontSize.xs, fontWeight: '600', color: Colors.blue, fontFamily: 'monospace' },
  findingTitle: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary, marginBottom: 6, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  metaText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  dot: { fontSize: FontSize.xs, color: Colors.textHint },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dueDate: { fontSize: FontSize.xs, color: Colors.amberDark, fontWeight: '500' },
  responseBox: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.border,
  },
  responseLabel: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
  responseText: { fontSize: FontSize.xs, color: Colors.textPrimary, lineHeight: 18 },
});
