import { useRef, useState } from "react";
import { Button, ScrollView, Switch, Text, useWindowDimensions, View } from "react-native";
import { TimePicker, WheelPicker, type TimePickerHandle } from "@asleep-ai/react-native-wheel-picker";

export default function App() {
  const [fruit, setFruit] = useState(1);
  const [enabled, setEnabled] = useState(true);
  const [value, setValue] = useState({ hour: 7, minute: 0 });
  const [snapshot, setSnapshot] = useState("");
  const picker = useRef<TimePickerHandle>(null);
  const { fontScale } = useWindowDimensions();
  const factor = Math.min(fontScale, 1.3);
  const number = {
    width: 85 * factor,
    height: 216 * factor,
    rowHeight: 80 * factor,
    textStyle: { fontSize: 40 * factor },
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text accessibilityRole="header">Wheel picker example</Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text>Enable pickers</Text>
        <Switch accessibilityLabel="Enable pickers" value={enabled} onValueChange={setEnabled} />
      </View>
      <WheelPicker
        items={["Apple", "Banana", "Pear"]}
        selectedIndex={fruit}
        onSelect={setFruit}
        enabled={enabled}
        accessibilityLabel="Fruit"
        width={200}
        height={180}
        rowHeight={60}
        textStyle={{ fontSize: 24 }}
      />
      <TimePicker
        ref={picker}
        value={value}
        onChange={setValue}
        enabled={enabled}
        columns={{ period: { ...number, width: 60 * factor, textStyle: { fontSize: 22 * factor } }, number }}
      />
      <Button
        title="Freeze time"
        onPress={() => {
          const time = picker.current?.freeze();
          if (time) {
            setValue(time);
            setSnapshot(`${time.hour}:${String(time.minute).padStart(2, "0")}`);
          }
        }}
      />
      <Text accessibilityLiveRegion="polite">Frozen time: {snapshot || "none"}</Text>
    </ScrollView>
  );
}
